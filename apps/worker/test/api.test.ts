import { env, exports } from "cloudflare:workers";
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

describe("basics", () => {
  it("reports health", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, env: "test" });
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await api("/api/nope");
    expect(res.status).toBe(404);
    expect((await res.json<ErrorBody>()).error.code).toBe("not_found");
  });

  it("rejects state-changing requests from other origins", async () => {
    const res = await api("/api/feedback", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: JSON.stringify({ message: "hi", buildVersion: "x", route: "/" }),
    });
    expect(res.status).toBe(403);
  });

  it("validates request bodies", async () => {
    const res = await api("/api/feedback", { method: "POST", body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    expect((await res.json<ErrorBody>()).error.code).toBe("invalid_request");
  });
});

describe("email sign-in link", () => {
  it("signs in, loads the profile, and cannot be reused", async () => {
    const user = await insertUser({ displayName: "Mira", email: "mira@example.com" });
    const cookie = await signInByEmail(user.email);

    const me = await api("/api/me", { cookie });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ id: user.id, displayName: "Mira", passkeyCount: 0 });

    const mail = devOutbox.findLast((m) => m.to === user.email)!;
    const token = /#token=([\w-]+)/.exec(mail.text)![1];
    const reuse = await api("/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    expect(reuse.status).toBe(400);
    expect((await reuse.json<ErrorBody>()).error.code).toBe("link_expired");
  });

  it("answers the same for unknown emails and sends nothing", async () => {
    const before = devOutbox.length;
    const res = await api("/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@example.com" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(devOutbox.length).toBe(before);
  });

  it("limits how many links can be requested", async () => {
    const user = await insertUser({ email: "spam@example.com" });
    const before = devOutbox.length;
    for (let i = 0; i < 5; i++) {
      await api("/api/auth/email/request", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
    }
    expect(devOutbox.length - before).toBe(3);
  });

  it("logs out", async () => {
    const user = await insertUser({});
    const cookie = await signInByEmail(user.email);
    expect((await api("/api/auth/logout", { method: "POST", cookie })).status).toBe(204);
    expect((await api("/api/me", { cookie })).status).toBe(401);
  });
});

describe("profile", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/me")).status).toBe(401);
  });

  it("counts the user's passkeys", async () => {
    const user = await insertUser({});
    const other = await insertUser({});
    const addKey = (id: string, userId: string) =>
      env.DB.prepare(
        "INSERT INTO passkeys (id, user_id, public_key, counter, created_at) VALUES (?, ?, 'pk', 0, ?)",
      )
        .bind(id, userId, Date.now())
        .run();
    await addKey(`key-a-${user.id}`, user.id);
    await addKey(`key-b-${user.id}`, user.id);
    await addKey(`key-c-${other.id}`, other.id);
    const cookie = await signInByEmail(user.email);
    expect(await (await api("/api/me", { cookie })).json()).toMatchObject({ passkeyCount: 2 });
  });

  it("updates the display name", async () => {
    const user = await insertUser({});
    const cookie = await signInByEmail(user.email);
    const res = await api("/api/me", {
      method: "PATCH",
      cookie,
      body: JSON.stringify({ displayName: "  Swift Harpy " }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ displayName: "Swift Harpy" });
  });
});

describe("invites", () => {
  it("lets players create up to 3 codes, which then work for sign-up", async () => {
    await insertUser({ isAdmin: true }); // make sure we're past bootstrap
    const user = await insertUser({});
    const cookie = await signInByEmail(user.email);

    const codes: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await api("/api/invites", { method: "POST", cookie });
      expect(res.status).toBe(201);
      codes.push((await res.json<{ code: string }>()).code);
    }
    const fourth = await api("/api/invites", { method: "POST", cookie });
    expect(fourth.status).toBe(403);

    const list = await (await api("/api/invites", { cookie })).json<{ invites: unknown[] }>();
    expect(list.invites).toHaveLength(3);

    const options = await api("/api/auth/register/options", {
      method: "POST",
      body: JSON.stringify({
        displayName: "Newbie",
        email: "newbie@example.com",
        inviteCode: codes[0]!.toLowerCase(),
      }),
    });
    expect(options.status).toBe(200);

    const bad = await api("/api/auth/register/options", {
      method: "POST",
      body: JSON.stringify({
        displayName: "Newbie",
        email: "n2@example.com",
        inviteCode: "AAAA-BBBB",
      }),
    });
    expect((await bad.json<ErrorBody>()).error.code).toBe("invalid_invite");
  });

  it("gives admins unlimited codes", async () => {
    const admin = await insertUser({ isAdmin: true });
    const cookie = await signInByEmail(admin.email);
    for (let i = 0; i < 5; i++) {
      expect((await api("/api/invites", { method: "POST", cookie })).status).toBe(201);
    }
  });

  it("refuses sign-up with an email that already has an account", async () => {
    await insertUser({ email: "taken@example.com" });
    const res = await api("/api/auth/register/options", {
      method: "POST",
      body: JSON.stringify({
        displayName: "Dup",
        email: "TAKEN@example.com",
        inviteCode: "AAAA-BBBB",
      }),
    });
    expect(res.status).toBe(409);
  });
});

describe("feedback", () => {
  it("accepts feedback from anyone and lists it for admins only", async () => {
    const post = await api("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        message: "GPS was slow to lock",
        buildVersion: "0.0.0+abc123",
        route: "/device-check",
        context: { gps: "ok" },
      }),
    });
    expect(post.status).toBe(201);

    const player = await insertUser({});
    const playerCookie = await signInByEmail(player.email);
    expect((await api("/api/admin/feedback", { cookie: playerCookie })).status).toBe(403);

    const admin = await insertUser({ isAdmin: true });
    const adminCookie = await signInByEmail(admin.email);
    const list = await api("/api/admin/feedback", { cookie: adminCookie });
    expect(list.status).toBe(200);
    const { items } = await list.json<{ items: Array<{ message: string }> }>();
    expect(items.some((i) => i.message === "GPS was slow to lock")).toBe(true);
  });
});

describe("live channel (RaidRoom)", () => {
  it("answers pings over a WebSocket", async () => {
    const res = await exports.default.fetch("http://example.com/api/live/echo", {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();
    const reply = new Promise<string>((resolve) =>
      ws.addEventListener("message", (e) => resolve(e.data as string), { once: true }),
    );
    ws.send(JSON.stringify({ type: "ping", sentAt: 123 }));
    expect(JSON.parse(await reply)).toEqual({ type: "pong", sentAt: 123, connections: 1 });
    ws.close();
  });

  it("requires a WebSocket upgrade", async () => {
    const res = await api("/api/live/echo");
    expect(res.status).toBe(426);
  });
});
