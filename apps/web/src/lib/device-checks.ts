import type { LiveMessage } from "@runhach/shared";
import { BALANCE } from "@runhach/game";
import { platformAuthenticatorIsAvailable, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { ScreenKeeper } from "./wake-lock";

export type CheckId =
  | "secure"
  | "installed"
  | "gps"
  | "wakeLock"
  | "speech"
  | "sound"
  | "vibration"
  | "passkeys"
  | "storage"
  | "live";

export type CheckStatus = "idle" | "pending" | "pass" | "warn" | "fail";

export interface CheckResult {
  status: CheckStatus;
  /** i18n key under deviceCheck.details */
  detail?: string;
  params?: Record<string, string | number>;
}

export const CHECK_ORDER: CheckId[] = [
  "secure",
  "installed",
  "gps",
  "wakeLock",
  "speech",
  "sound",
  "vibration",
  "passkeys",
  "storage",
  "live",
];

const ok = (detail?: string, params?: CheckResult["params"]): CheckResult => ({
  status: "pass",
  ...(detail ? { detail } : {}),
  ...(params ? { params } : {}),
});
const warn = (detail: string, params?: CheckResult["params"]): CheckResult => ({
  status: "warn",
  detail,
  ...(params ? { params } : {}),
});
const fail = (detail: string, params?: CheckResult["params"]): CheckResult => ({
  status: "fail",
  detail,
  ...(params ? { params } : {}),
});

export const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T) =>
  Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

const CHECKS: Record<CheckId, () => Promise<CheckResult>> = {
  async secure() {
    return window.isSecureContext ? ok("yes") : fail("notSupported");
  },

  async installed() {
    return isStandalone() ? ok("yes") : warn("notInstalled");
  },

  gps() {
    if (!("geolocation" in navigator)) return Promise.resolve(fail("notSupported"));
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const accuracy = Math.round(pos.coords.accuracy);
          resolve(
            accuracy <= BALANCE.antiCheat.maxAccuracyMeters
              ? ok("gpsAccuracy", { accuracy })
              : warn("gpsWeak", { accuracy }),
          );
        },
        (err) =>
          resolve(
            err.code === err.PERMISSION_DENIED
              ? fail("gpsDenied")
              : err.code === err.TIMEOUT
                ? warn("gpsTimeout")
                : fail("error", { message: err.message }),
          ),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
      );
    });
  },

  async wakeLock() {
    if (!ScreenKeeper.supported) return fail("notSupported");
    const keeper = new ScreenKeeper();
    const acquired = await keeper.acquire();
    await keeper.release();
    return acquired ? ok("wakeLockOk") : fail("notSupported");
  },

  async speech() {
    if (!("speechSynthesis" in window)) return fail("notSupported");
    const utterance = new SpeechSynthesisUtterance("Device check. You found a legendary chest!");
    const spoken = new Promise<boolean>((resolve) => {
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
    });
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    // Some browsers never fire onend without voices installed; don't hang.
    await withTimeout(spoken, 5000, true);
    return ok("speechOk");
  },

  async sound() {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return fail("notSupported");
    const ctx = new Ctx();
    await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(990, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    await new Promise((r) => setTimeout(r, 300));
    await ctx.close();
    return ok("soundOk");
  },

  async vibration() {
    if (!("vibrate" in navigator)) return warn(isIos() ? "vibrationIos" : "notSupported");
    navigator.vibrate([80, 60, 160]);
    return ok("vibrationOk");
  },

  async passkeys() {
    if (!browserSupportsWebAuthn()) return fail("notSupported");
    return (await platformAuthenticatorIsAvailable())
      ? ok("passkeysOk")
      : warn("passkeysNoPlatform");
  },

  async storage() {
    if (!("indexedDB" in window)) return fail("notSupported");
    const opened = await new Promise<boolean>((resolve) => {
      const req = indexedDB.open("runhach-device-check", 1);
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase("runhach-device-check");
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
    return opened ? ok("storageOk") : fail("notSupported");
  },

  live() {
    return new Promise((resolve) => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${protocol}://${window.location.host}/api/live/echo`);
      } catch {
        resolve(fail("liveFailed"));
        return;
      }
      const timer = setTimeout(() => {
        ws.close();
        resolve(fail("liveFailed"));
      }, 8000);
      const ping: LiveMessage = { type: "ping", sentAt: performance.now() };
      ws.onopen = () => ws.send(JSON.stringify(ping));
      ws.onmessage = (event) => {
        clearTimeout(timer);
        const msg = JSON.parse(String(event.data)) as LiveMessage;
        ws.close();
        resolve(ok("liveOk", { ms: Math.round(performance.now() - msg.sentAt) }));
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve(fail("liveFailed"));
      };
    });
  },
};

export async function runCheck(id: CheckId): Promise<CheckResult> {
  try {
    return await CHECKS[id]();
  } catch (err) {
    return fail("error", { message: err instanceof Error ? err.message : String(err) });
  }
}
