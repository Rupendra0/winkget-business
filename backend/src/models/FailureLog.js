const { Schema, model, models } = require("mongoose");

const failureLogSchema = new Schema(
  {
    source: { type: String, required: true, trim: true },
    type: { type: String, enum: ["failure", "warning"], default: "failure" },
    message: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "vendor", "customer"] },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

failureLogSchema.index({ createdAt: -1 });
failureLogSchema.index({ source: 1, createdAt: -1 });

module.exports = models.FailureLog || model("FailureLog", failureLogSchema);
