/**
 * Keeps the screen on (Screen Wake Lock API). Browsers drop the lock when the
 * page is hidden, so it is re-acquired whenever the page becomes visible again.
 */
export class ScreenKeeper {
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;

  static get supported(): boolean {
    return typeof navigator !== "undefined" && "wakeLock" in navigator;
  }

  get active(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  async acquire(): Promise<boolean> {
    this.wanted = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    return this.request();
  }

  async release(): Promise<void> {
    this.wanted = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    await this.sentinel?.release().catch(() => undefined);
    this.sentinel = null;
  }

  private onVisibility = () => {
    if (this.wanted && document.visibilityState === "visible" && !this.active) void this.request();
  };

  private async request(): Promise<boolean> {
    if (!ScreenKeeper.supported) return false;
    try {
      this.sentinel = await navigator.wakeLock.request("screen");
      return true;
    } catch {
      return false;
    }
  }
}
