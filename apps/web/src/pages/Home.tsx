import { levelFromTotalXp } from "@runhach/game";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PartyPanel } from "../components/PartyPanel";
import { DEV_TOOLS } from "../config";
import { useMe } from "../lib/auth";
import { useProgress } from "../lib/progress";

function Welcome() {
  const { t } = useTranslation();
  return (
    <div className="stack">
      <section className="panel hero">
        <img
          src="/icon-192.png"
          alt=""
          width={96}
          height={96}
          className="pixelated"
          style={{ marginBottom: 16 }}
        />
        <h1>{t("welcome.title")}</h1>
        <p>{t("welcome.body")}</p>
        <p className="muted small">{t("welcome.betaNote")}</p>
      </section>
      <Link to="/run" className="btn block">
        {t("home.startRun")}
      </Link>
      <Link to="/signup" className="btn block secondary">
        {t("welcome.createAccount")}
      </Link>
      <Link to="/login" className="btn block secondary">
        {t("welcome.signIn")}
      </Link>
      <Link to="/device-check" className="center">
        {t("welcome.deviceCheck")}
      </Link>
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { data: me, isPending } = useMe();
  const { totalXp } = useProgress();
  if (isPending) return <p className="muted">{t("common.loading")}</p>;
  if (!me) return <Welcome />;

  const progress = levelFromTotalXp(totalXp);
  return (
    <div className="stack">
      <section className="panel">
        <h1>{t("home.greeting", { name: me.displayName })}</h1>
        <div className="row">
          <strong>{t("home.level", { level: progress.level })}</strong>
          <span className="spacer" />
          <span className="muted small">
            {t("home.xp", { current: progress.xpIntoLevel, next: progress.xpForNextLevel })}
          </span>
        </div>
        <div className="xpbar" aria-hidden>
          <span style={{ width: `${(progress.xpIntoLevel / progress.xpForNextLevel) * 100}%` }} />
        </div>
      </section>
      <PartyPanel />
      <Link to="/run" className="btn block">
        {t("home.startRun")}
      </Link>
      <Link to="/inventory" className="btn block secondary">
        {t("home.inventory")}
      </Link>
      <Link to="/device-check" className="btn block secondary">
        {t("home.deviceCheck")}
      </Link>
      <Link to="/invites" className="btn block secondary">
        {t("home.invites")}
      </Link>
      <Link to="/profile" className="btn block secondary">
        {t("home.profile")}
      </Link>
      {me.isAdmin && (
        <Link to="/admin/feedback" className="btn block secondary">
          {t("home.adminFeedback")}
        </Link>
      )}
      {DEV_TOOLS && (
        <Link to="/dev/gps" className="btn block secondary">
          {t("home.gpsLab")}
        </Link>
      )}
    </div>
  );
}
