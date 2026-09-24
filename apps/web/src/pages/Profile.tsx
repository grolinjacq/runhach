import { DISPLAY_NAME_MAX, type Me } from "@runhach/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ErrorNotice } from "../components/ErrorNotice";
import { api } from "../lib/api";
import { addPasskey, signOut, useMe, useSetMe } from "../lib/auth";

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setMe = useSetMe();
  const { data: me } = useMe();
  const [displayName, setDisplayName] = useState(me?.displayName ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setMe(await api<Me>("/me", { method: "PATCH", json: { displayName } }));
      setMessage(t("profile.saved"));
    });
  };

  return (
    <div className="stack">
      <h1>{t("profile.title")}</h1>

      <form className="panel stack" onSubmit={save}>
        <div className="field">
          <label htmlFor="profile-name">{t("profile.displayName")}</label>
          <input
            id="profile-name"
            maxLength={DISPLAY_NAME_MAX}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn" disabled={busy || displayName === me.displayName}>
          {t("profile.save")}
        </button>
      </form>

      <section className="panel stack">
        <div>
          <div className="muted small">{t("profile.email")}</div>
          <div>{me.email}</div>
        </div>
        <div className="row">
          <span>{t("profile.passkeys", { count: me.passkeyCount })}</span>
          {me.isAdmin && <span className="status warn">{t("profile.admin")}</span>}
        </div>
        <div className="muted small">
          {t("profile.memberSince", {
            date: new Date(me.createdAt).toLocaleDateString(i18n.language),
          })}
        </div>
        <button
          type="button"
          className="btn secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              setMe(await addPasskey());
              setMessage(t("profile.passkeyAdded"));
            })
          }
        >
          {t("profile.addPasskey")}
        </button>
      </section>

      {message && <p className="notice success">{message}</p>}
      <ErrorNotice error={error} />

      <button
        type="button"
        className="btn block danger"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await signOut();
            setMe(null);
            navigate("/", { replace: true });
          })
        }
      >
        {t("profile.logout")}
      </button>
    </div>
  );
}
