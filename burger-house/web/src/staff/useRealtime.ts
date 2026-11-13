import { useEffect, useRef } from 'react';

/**
 * Subscribes to the API's server-sent events stream so dashboards stay in sync
 * without polling. Every handler is kept in a ref so the connection is opened
 * once per mount instead of reconnecting on each render.
 */
export function useRealtime(types: string[], onEvent: (type: string, data: unknown) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const key = types.join(',');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return;
    let source: EventSource | null = new EventSource('/api/events');
    let closed = false;

    const listeners: { type: string; fn: (event: MessageEvent) => void }[] = [];
    for (const type of key.split(',').filter(Boolean)) {
      const fn = (event: MessageEvent) => {
        let payload: unknown = null;
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = null;
        }
        handlerRef.current(type, payload);
      };
      source.addEventListener(type, fn as EventListener);
      listeners.push({ type, fn });
    }

    const onError = () => {
      // EventSource retries on its own; if it closed for good, reconnect once.
      if (closed) return;
      if (source && source.readyState === EventSource.CLOSED) {
        window.setTimeout(() => {
          if (!closed) {
            source?.close();
            source = new EventSource('/api/events');
            for (const listener of listeners) source.addEventListener(listener.type, listener.fn as EventListener);
          }
        }, 4000);
      }
    };
    source.addEventListener('error', onError);

    return () => {
      closed = true;
      source?.removeEventListener('error', onError);
      for (const listener of listeners) source?.removeEventListener(listener.type, listener.fn as EventListener);
      source?.close();
    };
  }, [key]);
}
