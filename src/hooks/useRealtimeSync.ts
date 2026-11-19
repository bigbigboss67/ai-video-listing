'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeEvent } from '@/types/domain';

export type SyncConnectionState = 'connecting' | 'connected' | 'reconnecting';

export function broadcastLocalSyncEvent(event: RealtimeEvent): void {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('makanreel_realtime');
      channel.postMessage(event);
      channel.close();
    } catch {
      // BroadcastChannel unavailable
    }
  }
}

export function useRealtimeSync(onEvent?: (event: RealtimeEvent) => void) {
  const [connectionState, setConnectionState] =
    useState<SyncConnectionState>('connecting');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const handleIncoming = (event: RealtimeEvent) => {
      if (!event?.id || seenIdsRef.current.has(event.id)) return;
      seenIdsRef.current.add(event.id);
      if (seenIdsRef.current.size > 200) {
        const oldest = seenIdsRef.current.values().next().value;
        if (oldest) seenIdsRef.current.delete(oldest);
      }
      setLastEvent(event);
      callbackRef.current?.(event);
    };

    // 1. Server-Sent Events stream for cross-device / mobile-to-web live sync
    let es: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events');
      es.addEventListener('connected', () => setConnectionState('connected'));
      es.addEventListener('sync', (msg) => {
        try {
          const parsed = JSON.parse((msg as MessageEvent).data) as RealtimeEvent;
          handleIncoming(parsed);
        } catch {
          // Ignore malformed event
        }
      });
      es.onerror = () => {
        setConnectionState('reconnecting');
      };
    }

    // 2. BroadcastChannel for instant multi-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('makanreel_realtime');
      bc.onmessage = (msg) => {
        const parsed = msg.data as RealtimeEvent;
        handleIncoming(parsed);
      };
    }

    return () => {
      es?.close();
      bc?.close();
    };
  }, []);

  return { connectionState, lastEvent };
}
