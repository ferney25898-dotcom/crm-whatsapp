"use client";

import { useEffect, useRef } from "react";
import type { AppEvent } from "@/lib/events";

/** Se suscribe al canal SSE del servidor y ejecuta el callback en cada evento. */
export function useLiveEvents(onEvent: (event: AppEvent) => void) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (message) => {
      try {
        handler.current(JSON.parse(message.data) as AppEvent);
      } catch {
        // ignoramos latidos y mensajes malformados
      }
    };
    return () => source.close();
  }, []);
}
