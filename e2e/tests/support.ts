import { readFileSync } from "node:fs";
import { parseGpx, type TrackPoint } from "@runhach/game";
import type { BrowserContext, Page } from "@playwright/test";

/**
 * Gives a page a software passkey authenticator (Chromium's virtual
 * authenticator), so sign-up and sign-in run the real WebAuthn flow.
 */
export async function addVirtualAuthenticator(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

export function loadGpxFixture(name: string): TrackPoint[] {
  return parseGpx(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

/** Feeds a track into the browser's emulated GPS, one fix at a time. */
export async function replayTrack(
  context: BrowserContext,
  points: readonly TrackPoint[],
  onFix?: (index: number) => Promise<void>,
): Promise<void> {
  for (const [i, p] of points.entries()) {
    await context.setGeolocation({ latitude: p.lat, longitude: p.lon, accuracy: 5 });
    await onFix?.(i);
  }
}
