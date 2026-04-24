"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const DEV_LOG_ENDPOINT = `${BACKEND_URL}/api/dev-logs`;
const DEDUPE_WINDOW_MS = 5000;
const MAX_DEDUPE_ENTRIES = 100;

type LogPayload = {
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
};

const toErrorMessage = (value: unknown): string => {
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
  const dedupeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const shouldSkipLog = (key: string) => {
      const now = Date.now();
      const existing = dedupeRef.current.get(key);
      if (existing && now - existing < DEDUPE_WINDOW_MS) {
        return true;
      }

      dedupeRef.current.set(key, now);
      if (dedupeRef.current.size > MAX_DEDUPE_ENTRIES) {
        const oldestKey = dedupeRef.current.keys().next().value;
        if (oldestKey) {
          dedupeRef.current.delete(oldestKey);
        }
      }

      return false;
    };

    const logFailure = async ({ source, message, metadata }: LogPayload) => {
      const trimmedMessage = String(message || "").trim();
      if (!trimmedMessage) {
        return;
      }

      const key = `${source}:${pathnameRef.current}:${trimmedMessage}`;
      if (shouldSkipLog(key)) {
        return;
      }

      try {
        await fetch(DEV_LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            source,
            type: "failure",
            role: "customer",
            message: trimmedMessage,
            metadata: {
              route: pathnameRef.current,
              ...metadata,
            },
          }),
        });
      } catch {
        // Ignore logging failures in the UI runtime.
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
      const method =
        init?.method ||
        (input instanceof Request ? input.method : "GET");

      try {
        const response = await originalFetch(input, init);

        if (!requestUrl.includes("/api/dev-logs") && !response.ok) {
          void logFailure({
            source: "frontend-fetch",
            message: `HTTP ${response.status} while requesting ${requestUrl || "unknown endpoint"}`,
            metadata: {
              method,
              status: response.status,
              statusText: response.statusText,
              url: requestUrl,
            },
          });
        }

        return response;
      } catch (error) {
        if (!requestUrl.includes("/api/dev-logs")) {
          void logFailure({
            source: "frontend-fetch",
            message: toErrorMessage(error),
            metadata: {
              method,
              url: requestUrl,
            },
          });
        }

        throw error;
      }
    };

    window.fetch = patchedFetch;

    const handleWindowError = (event: ErrorEvent) => {
      const eventTarget = event.target;

      if (
        eventTarget instanceof HTMLImageElement ||
        eventTarget instanceof HTMLScriptElement ||
        eventTarget instanceof HTMLLinkElement
      ) {
        const resourceUrl =
          eventTarget instanceof HTMLImageElement
            ? eventTarget.currentSrc || eventTarget.src
            : eventTarget instanceof HTMLLinkElement
              ? eventTarget.href
              : eventTarget.src;

        void logFailure({
          source: "frontend-resource",
          message: `Failed to load ${eventTarget.tagName.toLowerCase()}`,
          metadata: {
            url: resourceUrl,
            tagName: eventTarget.tagName.toLowerCase(),
          },
        });
        return;
      }

      void logFailure({
        source: "frontend-runtime",
        message: event.message || toErrorMessage(event.error),
        metadata: {
          file: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error instanceof Error ? event.error.stack : undefined,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void logFailure({
        source: "frontend-promise",
        message: toErrorMessage(event.reason),
        metadata: {
          stack: event.reason instanceof Error ? event.reason.stack : undefined,
        },
      });
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
