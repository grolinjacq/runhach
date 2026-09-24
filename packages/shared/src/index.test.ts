import { describe, expect, it } from "vitest";
import { displayNameSchema, emailSchema, inviteCodeSchema, registerOptionsRequestSchema } from ".";

describe("contracts", () => {
  it("normalises invite codes", () => {
    expect(inviteCodeSchema.parse(" abcd-12ef ")).toBe("ABCD-12EF");
    expect(inviteCodeSchema.safeParse("ABCD1234").success).toBe(false);
  });

  it("normalises emails", () => {
    expect(emailSchema.parse(" Runner@Example.COM ")).toBe("runner@example.com");
    expect(emailSchema.safeParse("nope").success).toBe(false);
  });

  it("accepts international display names and rejects markup", () => {
    expect(displayNameSchema.parse("  Jörg Müller ")).toBe("Jörg Müller");
    expect(displayNameSchema.safeParse("<script>").success).toBe(false);
    expect(displayNameSchema.safeParse("x").success).toBe(false);
  });

  it("allows registering without an invite code (bootstrap is checked server-side)", () => {
    expect(
      registerOptionsRequestSchema.safeParse({ displayName: "Mira", email: "m@example.com" })
        .success,
    ).toBe(true);
  });
});
