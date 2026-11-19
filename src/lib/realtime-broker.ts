import type { RealtimeEvent } from '@/types/domain';

type Listener = (event: RealtimeEvent) => void;

class RealtimeBroker {
  private listeners = new Set<Listener>();
  private recentEvents: RealtimeEvent[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: RealtimeEvent): void {
    this.recentEvents = [event, ...this.recentEvents].slice(0, 50);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore disconnected stream listeners
      }
    }
  }

  getRecent(limit = 10): RealtimeEvent[] {
    return this.recentEvents.slice(0, limit);
  }
}

const globalForBroker = globalThis as unknown as {
  __makanreelRealtimeBroker?: RealtimeBroker;
};

export const realtimeBroker =
  globalForBroker.__makanreelRealtimeBroker ??
  (globalForBroker.__makanreelRealtimeBroker = new RealtimeBroker());
