import { useEffect, useRef } from "react";

export interface UserSignalPayload {
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  createdAt: string;
}

export function useSignalCollector(venueId: string | undefined, tableId: string | null | undefined) {
  const bufferRef = useRef<UserSignalPayload[]>([]);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let sessId = sessionStorage.getItem("tripzy_session_id");
      if (!sessId) {
        sessId = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
        sessionStorage.setItem("tripzy_session_id", sessId);
      }
      sessionIdRef.current = sessId;
    }
  }, []);

  const trackEvent = (eventType: string, eventData: Record<string, any> = {}) => {
    if (!venueId) return;

    const signal: UserSignalPayload = {
      sessionId: sessionIdRef.current,
      eventType,
      eventData,
      createdAt: new Date().toISOString(),
    };

    bufferRef.current.push(signal);
    console.log(`[SignalCollector] Buffered event: ${eventType}`, eventData);

    // If buffer exceeds limit, flush immediately
    if (bufferRef.current.length >= 10) {
      flushBuffer();
    }
  };

  const flushBuffer = async () => {
    if (bufferRef.current.length === 0 || !venueId) return;

    const signalsToSend = [...bufferRef.current];
    bufferRef.current = []; // Clear buffer immediately to prevent double-sends

    console.log(`[SignalCollector] Flushing ${signalsToSend.length} events...`);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiUrl}/api/analytics/signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          venueId,
          tableId: tableId || null,
          signals: signalsToSend,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send signals");
      }
      console.log(`[SignalCollector] Successfully flushed signals.`);
    } catch (error) {
      console.error("[SignalCollector] Error sending signals, restoring to buffer:", error);
      // Restore signals to front of buffer to retry
      bufferRef.current = [...signalsToSend, ...bufferRef.current].slice(0, 50); // limit max recovery size
    }
  };

  // Flush buffer on interval (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      flushBuffer();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [venueId, tableId]);

  // Flush buffer on page unload/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (bufferRef.current.length > 0 && venueId) {
          const payload = JSON.stringify({
            venueId,
            tableId: tableId || null,
            signals: bufferRef.current,
          });
          bufferRef.current = []; // Clear
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
          
          if (navigator.sendBeacon) {
            navigator.sendBeacon(`${apiUrl}/api/analytics/signals`, new Blob([payload], { type: "application/json" }));
          } else {
            fetch(`${apiUrl}/api/analytics/signals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              keepalive: true, // allow request to outlive page unload
            }).catch(() => {});
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [venueId, tableId]);

  return {
    trackViewItem: (itemId: string, durationMs: number) => trackEvent("view_item", { itemId, durationMs }),
    trackExpandItem: (itemId: string) => trackEvent("expand_item", { itemId }),
    trackClickFilter: (filterKey: string) => trackEvent("filter_dietary", { filterKey }),
    trackScrollCategory: (categoryId: string) => trackEvent("scroll_category", { categoryId }),
    trackLanguageToggle: (locale: string) => trackEvent("change_language", { locale }),
    trackAddToCart: (itemId: string) => trackEvent("add_to_cart", { itemId }),
    flush: flushBuffer
  };
}
