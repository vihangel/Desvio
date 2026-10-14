export class PlaybackCoordinator {
  private owner: string | null = null;
  private stops = new Map<string, () => void>();
  private listeners = new Set<() => void>();
  register(id: string, stop: () => void) {
    this.stops.set(id, stop);
    return () => {
      this.stops.get(id)?.();
      this.stops.delete(id);
      this.release(id);
    };
  }
  current = () => this.owner;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  claim(id: string) {
    if (this.owner === id) return;
    const previous = this.owner;
    this.owner = id;
    if (previous) this.stops.get(previous)?.();
    this.listeners.forEach((fn) => fn());
  }
  release(id: string) {
    if (this.owner === id) {
      this.owner = null;
      this.listeners.forEach((fn) => fn());
    }
  }
  stopAll() {
    const old = this.owner;
    this.owner = null;
    if (old) this.stops.get(old)?.();
    this.listeners.forEach((fn) => fn());
  }
}
export const mediaPlayback = new PlaybackCoordinator();
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) mediaPlayback.stopAll();
  });
