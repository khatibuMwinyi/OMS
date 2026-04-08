"use client";

import { useEffect, useRef } from "react";

import { SESSION_IDLE_TIMEOUT_MS } from "@/lib/session-config";

const REFRESH_THROTTLE_MS = 1000 * 60 * 2;

export function SessionActivityMonitor() {
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    function clearIdleTimer() {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }

    function scheduleLogout() {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        void expireSession();
      }, SESSION_IDLE_TIMEOUT_MS);
    }

    async function refreshSession(force = false) {
      if (loggingOutRef.current) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshRef.current < REFRESH_THROTTLE_MS) {
        scheduleLogout();
        return;
      }

      lastRefreshRef.current = now;

      try {
        const response = await fetch("/api/session/refresh", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          keepalive: true,
        });

        if (!response.ok) {
          await expireSession();
          return;
        }
      } catch {
        return;
      } finally {
        if (!loggingOutRef.current) {
          scheduleLogout();
        }
      }
    }

    async function expireSession() {
      if (loggingOutRef.current) {
        return;
      }

      loggingOutRef.current = true;
      clearIdleTimer();

      try {
        await fetch("/api/session/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          keepalive: true,
        });
      } catch {
        // Ignore network failures and still end the client session.
      } finally {
        window.location.assign("/");
      }
    }

    function handleActivity() {
      if (loggingOutRef.current) {
        return;
      }

      const now = Date.now();
      lastActivityRef.current = now;
      scheduleLogout();
      void refreshSession();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastActivityRef.current >= SESSION_IDLE_TIMEOUT_MS) {
          void expireSession();
          return;
        }

        handleActivity();
      }
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
      "focus",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    scheduleLogout();

    return () => {
      clearIdleTimer();
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}