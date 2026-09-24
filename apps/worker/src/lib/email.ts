import type { Bindings } from "../env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Emails "sent" without a provider in development and tests. Tests read this
 * to follow login links; it is never exposed over HTTP.
 */
export const devOutbox: OutgoingEmail[] = [];

export function emailLoginEnabled(env: Bindings): boolean {
  return isLocalEnv(env) || Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export function isLocalEnv(env: Bindings): boolean {
  return env.APP_ENV === "development" || env.APP_ENV === "test";
}

export async function sendEmail(env: Bindings, email: OutgoingEmail): Promise<void> {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, ...email }),
    });
    if (!res.ok) throw new Error(`Email provider responded ${res.status}: ${await res.text()}`);
    return;
  }
  if (isLocalEnv(env)) {
    devOutbox.push(email);
    console.log(`[dev email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return;
  }
  throw new Error("Email sending is not configured");
}
