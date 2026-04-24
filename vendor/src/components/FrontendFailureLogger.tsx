"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const DEV_LOG_ENDPOINT = `${BACKEND_URL}/api/dev-logs`;
const DEDUPE_WINDOW_MS = 5000;

const toMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message || value.name || "Unknown error";
  }

  if (typeof value === "string") {
    return value || "Unknown error";
  }

  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message?: unknown }).message || "Unknown error");
  }

  return "Unknown error";
};

export default function FrontendFailureLogger() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const seenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const shouldSkip = (key: string) => {
      const now = Date.now();
      const existing = seenRef.current.get(key);
      if (existing && now - existing < DEDUPE_WINDOW_MS) {
        return true;
      }

      seenRef.current.set(key, now);
      if (seenRef.current.size > 100) {
        const oldestKey = seenRef.current.keys().next().value;
        if (oldestKey) {
          seenRef.current.delete(oldestKey);
        }
      }

      return false;
    };

    const logFailure = async (source: string, message: string, metadata?: Record<string, unknown>) => {
      const normalizedMessage = String(message || "").trim();
      if (!normalizedMessage) return;

      const key = `${source}:${pathnameRef.current}:${normalizedMessage}`;
      if (shouldSkip(key)) return;

      try {
        await fetch(DEV_LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            source,
            type: "failure",
            role: "vendor",
            message: normalizedMessage,
            metadata: {
              route: pathnameRef.current,
              ...metadata,
            },
          }),
        });
      } catch {
        // Ignore logger failures.
      }
    };

    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const requestUrl =
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input instanceof Request
            ? input.url
            : "";
      const method = init?.method || (input instanceof Request ? input.method : "GET");

      try {
        const response = await originalFetch(input, init);
        if (!requestUrl.includes("/api/dev-logs") && !response.ok) {
          void logFailure("vendor-frontend-fetch", `HTTP ${response.status} while requesting ${requestUrl || "unknown endpoint"}`, {
            method,
            status: response.status,
            statusText: response.statusText,
            url: requestUrl,
          });
        }
        return response;
      } catch (error) {
        if (!requestUrl.includes("/api/dev-logs")) {
          void logFailure("vendor-frontend-fetch", toMessage(error), {
            method,
            url: requestUrl,
          });
        }
        throw error;
      }
    };

    const handleError = (event: ErrorEvent) => {
      void logFailure("vendor-frontend-runtime", event.message || toMessage(event.error), {
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      void logFailure("vendor-frontend-promise", toMessage(event.reason), {
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
      });
    };

    window.fetch = patchedFetch;
    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
