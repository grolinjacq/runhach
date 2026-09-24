import { DISPLAY_NAME_MAX } from "@runhach/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ErrorNotice } from "../components/ErrorNotice";
import { signUpWithPasskey, useSetMe, useSignupStatus } from "../lib/auth";

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setMe = useSetMe();
  const [params] = useSearchParams();
  const { data: status } = useSignupStatus();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState(params.get("invite") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const bootstrap = status?.bootstrap ?? false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await signUpWithPasskey({
        displayName,
        email,
        ...(bootstrap ? {} : { inviteCode }),
      });
      setMe(me);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <h1>{t("signup.title")}</h1>
      <p className="muted small">{t("signup.passkeyExplain")}</p>
      {bootstrap && <p className="notice">{t("signup.bootstrapNote")}</p>}

      <div className="field">
        <label htmlFor="displayName">{t("signup.displayName")}</label>
        <input
          id="displayName"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="email">{t("signup.email")}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <span className="hint">{t("signup.emailHint")}</span>
      </div>
      {!bootstrap && (
        <div className="field">
          <label htmlFor="inviteCode">{t("signup.inviteCode")}</label>
          <input
            id="inviteCode"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD-1234"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
          <span className="hint">{t("signup.inviteHint")}</span>
        </div>
      )}

      <ErrorNotice error={error} />
      <button type="submit" className="btn block" disabled={busy}>
        {busy ? t("signup.working") : t("signup.submit")}
      </button>
      <Link to="/login" className="center">
        {t("signup.haveAccount")}
      </Link>
    </form>
  );
}
