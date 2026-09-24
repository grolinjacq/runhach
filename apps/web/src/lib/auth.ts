import type { Me, RegisterOptionsRequest, SignupStatus } from "@runhach/shared";
import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export const meQueryKey = ["me"] as const;

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return await api<Me>("/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useSignupStatus() {
  return useQuery({
    queryKey: ["signup-status"],
    queryFn: () => api<SignupStatus>("/auth/status"),
  });
}

/** Call after anything that changes who is signed in. */
export function useSetMe() {
  const qc = useQueryClient();
  return (me: Me | null) => qc.setQueryData(meQueryKey, me);
}

export async function signUpWithPasskey(input: RegisterOptionsRequest): Promise<Me> {
  const { challengeId, options } = await api<{
    challengeId: string;
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("/auth/register/options", { method: "POST", json: input });
  const response = await startRegistration({ optionsJSON: options });
  return api<Me>("/auth/register/verify", { method: "POST", json: { challengeId, response } });
}

export async function signInWithPasskey(): Promise<Me> {
  const { challengeId, options } = await api<{
    challengeId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("/auth/login/options", { method: "POST" });
  const response = await startAuthentication({ optionsJSON: options });
  return api<Me>("/auth/login/verify", { method: "POST", json: { challengeId, response } });
}

export async function addPasskey(): Promise<Me> {
  const { challengeId, options } = await api<{
    challengeId: string;
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("/auth/passkeys/options", { method: "POST" });
  const response = await startRegistration({ optionsJSON: options });
  return api<Me>("/auth/passkeys/verify", { method: "POST", json: { challengeId, response } });
}

export function requestEmailLink(email: string) {
  return api<{ sent: true; devLink?: string }>("/auth/email/request", {
    method: "POST",
    json: { email },
  });
}

export function verifyEmailLink(token: string) {
  return api<Me>("/auth/email/verify", { method: "POST", json: { token } });
}

export function signOut() {
  return api<void>("/auth/logout", { method: "POST" });
}

/** Maps errors (API or WebAuthn) to an i18n key or a server message. */
export function describeError(err: unknown): { key: string } | { message: string } {
  if (err instanceof ApiError) {
    return err.code === "network" ? { key: "errors.network" } : { message: err.message };
  }
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "AbortError") {
      return { key: "errors.passkeyCancelled" };
    }
    if (err.name === "NotSupportedError") return { key: "errors.passkeysUnsupported" };
  }
  return { key: "errors.generic" };
}
