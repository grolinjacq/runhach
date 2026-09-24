import { expect, test } from "@playwright/test";
import { addVirtualAuthenticator } from "./support";

test("passkey sign-up, invites, sign-in and email-link fallback", async ({ browser }) => {
  // ---- The first player bootstraps the beta and becomes admin ----
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await addVirtualAuthenticator(admin);

  await test.step("first sign-up needs no invite", async () => {
    await admin.goto("/");
    await admin.getByRole("link", { name: "Create account" }).click();
    await expect(admin.getByText("You're the very first player")).toBeVisible();
    await expect(admin.getByLabel("Invite code")).toHaveCount(0);
    await admin.getByLabel("Adventurer name").fill("Admin Ada");
    await admin.getByLabel("Email").fill("ada@example.com");
    await admin.getByRole("button", { name: "Create passkey & join" }).click();
    await expect(admin.getByRole("heading", { name: "Hail, Admin Ada!" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Tester feedback" })).toBeVisible();
  });

  let inviteCode = "";
  await test.step("create an invite code", async () => {
    await admin.getByRole("link", { name: "Invite friends" }).click();
    await admin.getByRole("button", { name: "Create invite code" }).click();
    const code = admin.locator(".code").first();
    await expect(code).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    inviteCode = (await code.textContent())!;
  });

  await test.step("sign out and back in with the passkey", async () => {
    await admin.goto("/profile");
    await admin.getByRole("button", { name: "Sign out" }).click();
    await expect(admin.getByRole("heading", { name: "Run. Loot. Level up." })).toBeVisible();
    await admin.getByRole("link", { name: "Sign in" }).click();
    await admin.getByRole("button", { name: "Sign in with passkey" }).click();
    await expect(admin.getByRole("heading", { name: "Hail, Admin Ada!" })).toBeVisible();
  });

  // ---- A friend joins with the invite link ----
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await addVirtualAuthenticator(friend);

  await test.step("friend signs up with the shared invite link", async () => {
    await friend.goto(`/signup?invite=${inviteCode}`);
    await expect(friend.getByLabel("Invite code")).toHaveValue(inviteCode);
    await friend.getByLabel("Adventurer name").fill("Mira");
    await friend.getByLabel("Email").fill("mira@example.com");
    await friend.getByRole("button", { name: "Create passkey & join" }).click();
    await expect(friend.getByRole("heading", { name: "Hail, Mira!" })).toBeVisible();
    await expect(friend.getByRole("link", { name: "Tester feedback" })).toHaveCount(0);
  });

  await test.step("the used invite shows who joined", async () => {
    await admin.goto("/invites");
    await expect(admin.getByText("Used by Mira")).toBeVisible();
  });

  await test.step("a used invite code can't be reused", async () => {
    const stranger = await (await browser.newContext()).newPage();
    await addVirtualAuthenticator(stranger);
    await stranger.goto(`/signup?invite=${inviteCode}`);
    await stranger.getByLabel("Adventurer name").fill("Sneaky");
    await stranger.getByLabel("Email").fill("sneaky@example.com");
    await stranger.getByRole("button", { name: "Create passkey & join" }).click();
    await expect(stranger.getByRole("alert")).toContainText("invalid or already used");
  });

  await test.step("friend on a new phone signs in by email link, then adds a passkey", async () => {
    const newPhone = await (await browser.newContext()).newPage();
    await addVirtualAuthenticator(newPhone);
    await newPhone.goto("/login");
    await newPhone.getByLabel("Email").fill("mira@example.com");
    await newPhone.getByRole("button", { name: "Email me a link" }).click();
    await expect(newPhone.getByText("a sign-in link is on its way")).toBeVisible();
    // Local dev shows the link instead of emailing it.
    await newPhone.locator("a[href*='/login/email#token=']").click();
    await expect(
      newPhone.getByRole("heading", { name: "Add a passkey on this device?" }),
    ).toBeVisible();
    await newPhone.getByRole("button", { name: "Add passkey" }).click();
    await expect(newPhone.getByRole("heading", { name: "Hail, Mira!" })).toBeVisible();
    await newPhone.goto("/profile");
    await expect(newPhone.getByText("2 passkeys")).toBeVisible();
  });
});
