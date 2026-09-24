import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { ErrorNotice } from "../components/ErrorNotice";
import { requestEmailLink, signInWithPasskey, useSetMe, useSignupStatus } from "../lib/auth";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setMe = useSetMe();
  const { data: status } = useSignupStatus();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);

  const passkey = async () => {
    setBusy(true);
    setError(null);
    try {
      setMe(await signInWithPasskey());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const emailLink = async (e: FormEvent) => {
    e.preventDefault();
    setEmailState("sending");
    setError(null);
    try {
      const res = await requestEmailLink(email);
      setDevLink(res.devLink ?? null);
      setEmailState("sent");
    } catch (err) {
      setError(err);
      setEmailState("idle");
    }
  };

  return (
    <div className="stack">
      <h1>{t("login.title")}</h1>
      <button type="button" className="btn block" onClick={passkey} disabled={busy}>
        {busy ? t("login.working") : t("login.passkey")}
      </button>
      <ErrorNotice error={error} />

      <p className="center muted">— {t("login.or")} —</p>

      <form className="panel stack" onSubmit={emailLink}>
        <h2>{t("login.emailTitle")}</h2>
        {status && !status.emailLoginEnabled ? (
          <p className="notice">{t("login.emailDisabled")}</p>
        ) : emailState === "sent" ? (
          <>
            <p className="notice success">{t("login.emailSent")}</p>
            {devLink && (
              <p className="small">
                {t("login.devLink")} <a href={devLink}>{devLink}</a>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="login-email">{t("login.emailLabel")}</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn secondary" disabled={emailState === "sending"}>
              {t("login.emailSubmit")}
            </button>
          </>
        )}
      </form>

      <Link to="/signup" className="center">
        {t("login.noAccount")}
      </Link>
    </div>
  );
}
