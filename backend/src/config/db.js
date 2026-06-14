const mongoose = require("mongoose");

let cachedConnectionPromise = null;

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function setupSlowQueryLogging(connection) {
  const thresholdMs = toPositiveInt(process.env.SLOW_QUERY_THRESHOLD_MS, 200);
  const client = connection.getClient();
  if (!client || client.__winkgetSlowQueryLoggingAttached) {
    return;
  }

  client.__winkgetSlowQueryLoggingAttached = true;

  const commandStartMap = new Map();
  const trackedCommands = new Set([
    "find",
    "aggregate",
    "count",
    "countDocuments",
    "distinct",
    "insert",
    "update",
    "delete",
    "findAndModify",
  ]);

  const resolveCollection = (entry) => {
    const command = entry.command || {};
    return (
      command[entry.commandName] ||
      command.find ||
      command.aggregate ||
      command.update ||
      command.delete ||
      command.findAndModify ||
      command.count ||
      command.distinct ||
      "unknown"
    );
  };

  client.on("commandStarted", (event) => {
    if (!trackedCommands.has(event.commandName)) {
      return;
    }

    commandStartMap.set(event.requestId, {
      startedAt: Date.now(),
      commandName: event.commandName,
      command: event.command,
      databaseName: event.databaseName,
    });
  });

  const logCompletedCommand = (event, failed = false) => {
    const entry = commandStartMap.get(event.requestId);
    if (!entry) {
      return;
    }

    commandStartMap.delete(event.requestId);
    const durationMs = Date.now() - entry.startedAt;
    if (durationMs < thresholdMs) {
      return;
    }

    const collectionName = resolveCollection(entry);
    // eslint-disable-next-line no-console
    console.warn(
      `[db:slow] ${entry.databaseName}.${collectionName} ${entry.commandName} ${durationMs}ms${failed ? " (failed)" : ""}`
    );
  };

  client.on("commandSucceeded", (event) => logCompletedCommand(event, false));
  client.on("commandFailed", (event) => logCompletedCommand(event, true));
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "winkget_business";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  const connectOptions = {
    dbName,
    serverSelectionTimeoutMS: toPositiveInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10000),
    maxPoolSize: toPositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10),
    minPoolSize: toPositiveInt(process.env.MONGODB_MIN_POOL_SIZE, 2),
    maxIdleTimeMS: toPositiveInt(process.env.MONGODB_MAX_IDLE_TIME_MS, 30000),
    socketTimeoutMS: toPositiveInt(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45000),
    connectTimeoutMS: 30000,
    monitorCommands: true,
    autoIndex: process.env.NODE_ENV === "development" || String(process.env.AUTO_INDEX_ON_START || "").toLowerCase() === "true",
  };

  cachedConnectionPromise = mongoose
    .connect(mongoUri, connectOptions)
    .then((instance) => {
      setupSlowQueryLogging(instance.connection);
      return instance.connection;
    })
    .catch((error) => {
      cachedConnectionPromise = null;
      throw error;
    });

  return cachedConnectionPromise;
}

module.exports = {
  connectDatabase,
};
