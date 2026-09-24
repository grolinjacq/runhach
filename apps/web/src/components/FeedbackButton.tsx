import { FEEDBACK_MAX } from "@runhach/shared";
import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { sendFeedback } from "../lib/feedback";
import { ErrorNotice } from "./ErrorNotice";

export function FeedbackButton() {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<unknown>(null);

  const open = () => {
    setState("idle");
    setError(null);
    dialog.current?.showModal();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      await sendFeedback(message.trim());
      setMessage("");
      setState("sent");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  };

  return (
    <>
      <button type="button" className="btn small secondary" onClick={open}>
        {t("feedback.button")}
      </button>
      <dialog ref={dialog} aria-labelledby="feedback-title">
        <form className="panel stack" onSubmit={submit}>
          <h2 id="feedback-title">{t("feedback.title")}</h2>
          {state === "sent" ? (
            <p className="notice success">{t("feedback.sent")}</p>
          ) : (
            <textarea
              aria-label={t("feedback.title")}
              placeholder={t("feedback.placeholder")}
              maxLength={FEEDBACK_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          )}
          <ErrorNotice error={error} />
          <div className="row">
            <button type="button" className="btn secondary" onClick={() => dialog.current?.close()}>
              {t("feedback.close")}
            </button>
            {state !== "sent" && (
              <button
                type="submit"
                className="btn"
                disabled={state === "sending" || !message.trim()}
              >
                {t("feedback.send")}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
