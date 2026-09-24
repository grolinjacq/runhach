import type { PartyResponse } from "@runhach/shared";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { devOutbox } from "../src/lib/email";
import { api, insertUser, sessionCookie } from "./helpers";

type ErrorBody = { error: { code: string; message: string } };

async function signInByEmail(email: string): Promise<string> {
  const res = await api("/api/auth/email/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  expect(res.status).toBe(200);
  const mail = devOutbox.findLast((m) => m.to === email);
  const token = /#token=([\w-]+)/.exec(mail?.text ?? "")?.[1];
  expect(token).toBeTruthy();
  const verify = await api("/api/auth/email/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  expect(verify.status).toBe(200);
  return sessionCookie(verify);
}

async function link(inviterId: string, inviteeId: string) {
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO invite_codes (code, created_by, created_at, used_by, used_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID().slice(0, 9), inviterId, now - 1000, inviteeId, now)
    .run();
}

async function getParty(cookie: string): Promise<PartyResponse> {
  const res = await api("/api/party", { cookie });
  expect(res.status).toBe(200);
  return res.json<PartyResponse>();
}

const run = {
  distanceMeters: 3210,
  durationSeconds: 1200,
  xp: 371,
  bestItem: { name: "Stormforged Mace", rarity: "epic", slot: "weapon", base: "mace" },
};

describe("party", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/party")).status).toBe(401);
    const res = await api("/api/party/runs", { method: "POST", body: JSON.stringify(run) });
    expect(res.status).toBe(401);
  });

  it("links inviter and invitee both ways and shares runs between them only", async () => {
    const ada = await insertUser({ displayName: "Ada" });
    const mira = await insertUser({ displayName: "Mira" });
    const carl = await insertUser({ displayName: "Carl" });
    await link(ada.id, mira.id);
    const adaCookie = await signInByEmail(ada.email);
    const miraCookie = await signInByEmail(mira.email);
    const carlCookie = await signInByEmail(carl.email);

    const adaParty = await getParty(adaCookie);
    expect(adaParty.members).toEqual([
      expect.objectContaining({ id: mira.id, displayName: "Mira", relation: "you-invited" }),
    ]);
    const miraParty = await getParty(miraCookie);
    expect(miraParty.members).toEqual([
      expect.objectContaining({ id: ada.id, displayName: "Ada", relation: "invited-you" }),
    ]);
    expect((await getParty(carlCookie)).members).toEqual([]);

    const posted = await api("/api/party/runs", {
      method: "POST",
      cookie: miraCookie,
      body: JSON.stringify(run),
    });
    expect(posted.status).toBe(201);
    const carlRun = await api("/api/party/runs", {
      method: "POST",
      cookie: carlCookie,
      body: JSON.stringify({ ...run, bestItem: null }),
    });
    expect(carlRun.status).toBe(201);

    const expected = {
      userId: mira.id,
      displayName: "Mira",
      distanceMeters: 3210,
      durationSeconds: 1200,
      xp: 371,
      bestItem: run.bestItem,
    };
    const adaFeed = (await getParty(adaCookie)).feed;
    expect(adaFeed).toEqual([expect.objectContaining({ ...expected, isMe: false })]);
    const miraFeed = (await getParty(miraCookie)).feed;
    expect(miraFeed).toEqual([expect.objectContaining({ ...expected, isMe: true })]);

    const carlFeed = (await getParty(carlCookie)).feed;
    expect(carlFeed).toEqual([
      expect.objectContaining({ userId: carl.id, isMe: true, bestItem: null }),
    ]);
  });

  it("lists the feed newest first", async () => {
    const ada = await insertUser({ displayName: "Ada" });
    const mira = await insertUser({ displayName: "Mira" });
    await link(ada.id, mira.id);
    const adaCookie = await signInByEmail(ada.email);
    const miraCookie = await signInByEmail(mira.email);
    for (const [cookie, xp] of [
      [adaCookie, 1],
      [miraCookie, 2],
      [adaCookie, 3],
    ] as const) {
      const res = await api("/api/party/runs", {
        method: "POST",
        cookie,
        body: JSON.stringify({ ...run, xp }),
      });
      expect(res.status).toBe(201);
    }
    const feed = (await getParty(miraCookie)).feed;
    expect(feed.map((f) => [f.displayName, f.xp, f.isMe])).toEqual([
      ["Ada", 3, false],
      ["Mira", 2, true],
      ["Ada", 1, false],
    ]);
  });

  it("validates run reports", async () => {
    const user = await insertUser({});
    const cookie = await signInByEmail(user.email);
    for (const bad of [
      {},
      { ...run, distanceMeters: -1 },
      { ...run, distanceMeters: 200_001 },
      { ...run, xp: 1.5 },
      { ...run, bestItem: { ...run.bestItem, rarity: "mythic" } },
      { ...run, bestItem: { ...run.bestItem, name: "x".repeat(81) } },
    ]) {
      const res = await api("/api/party/runs", {
        method: "POST",
        cookie,
        body: JSON.stringify(bad),
      });
      expect(res.status).toBe(400);
      expect((await res.json<ErrorBody>()).error.code).toBe("invalid_request");
    }
  });
});
