import { describe, expect, it } from "vitest";
import { api, insertUser } from "./helpers";

// Runs in its own file so the users table starts empty.
describe("first account bootstrap", () => {
  it("allows sign-up without an invite only while no users exist", async () => {
    const status = await (await api("/api/auth/status")).json<{ bootstrap: boolean }>();
    expect(status.bootstrap).toBe(true);

    const res = await api("/api/auth/register/options", {
      method: "POST",
      body: JSON.stringify({ displayName: "First", email: "first@example.com" }),
    });
    expect(res.status).toBe(200);
    const { challengeId, options } = await res.json<{
      challengeId: string;
      options: { rp: { id: string }; authenticatorSelection: { residentKey: string } };
    }>();
    expect(challengeId).toBeTruthy();
    expect(options.rp.id).toBe("example.com");
    expect(options.authenticatorSelection.residentKey).toBe("required");

    await insertUser({ isAdmin: true });
    const after = await api("/api/auth/register/options", {
      method: "POST",
      body: JSON.stringify({ displayName: "Second", email: "second@example.com" }),
    });
    expect(after.status).toBe(400);
    expect((await after.json<{ error: { code: string } }>()).error.code).toBe("invite_required");
  });
});
