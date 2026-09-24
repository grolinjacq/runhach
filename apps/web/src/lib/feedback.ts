import type { FeedbackRequest } from "@runhach/shared";
import { APP_VERSION } from "../config";
import { api } from "./api";

export function sendFeedback(message: string, context?: FeedbackRequest["context"]) {
  const body: FeedbackRequest = {
    message,
    buildVersion: APP_VERSION,
    route: window.location.pathname,
    ...(context ? { context } : {}),
  };
  return api<{ id: string }>("/feedback", { method: "POST", json: body });
}
