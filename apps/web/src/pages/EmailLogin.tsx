import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { ErrorNotice } from "../components/ErrorNotice";
import { addPasskey, useSetMe, verifyEmailLink } from "../lib/auth";

export function EmailLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setMe = useSetMe();
  const started = useRef(false);
  const [state, setState] = useState<"verifying" | "offer-passkey" | "failed" | "missing">(
    "verifying",
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The token is in the URL fragment so it never reaches server logs.
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setState("missing");
      return;
    }
    verifyEmailLink(token)
      .then((me) => {
        setMe(me);
        if (browserSupportsWebAuthn()) setState("offer-passkey");
        else navigate("/", { replace: true });
      })
      .catch((err: unknown) => {
        setError(err);
        setState("failed");
      });
  }, [navigate, setMe]);

  const createPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      setMe(await addPasskey());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (state === "verifying") return <p>{t("emailLogin.title")}</p>;

  if (state === "missing" || state === "failed") {
    return (
      <div className="stack">
        <h1>{t("emailLogin.failed")}</h1>
        {state === "missing" ? <p>{t("emailLogin.missing")}</p> : <ErrorNotice error={error} />}
        <Link to="/login" className="btn block">
          {t("emailLogin.requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>{t("emailLogin.addPasskeyTitle")}</h1>
      <p>{t("emailLogin.addPasskeyBody")}</p>
      <ErrorNotice error={error} />
      <button type="button" className="btn block" onClick={createPasskey} disabled={busy}>
        {t("emailLogin.addPasskey")}
      </button>
      <button
        type="button"
        className="btn block secondary"
        onClick={() => navigate("/", { replace: true })}
      >
        {t("emailLogin.skip")}
      </button>
    </div>
  );
}
