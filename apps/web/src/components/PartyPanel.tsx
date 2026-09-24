import type { PartyActivity, PartyMember } from "@runhach/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useParty } from "../lib/party";

const AVATAR_COLORS = [
  "var(--gold)",
  "var(--green)",
  "var(--blue)",
  "var(--red)",
  "var(--rarity-epic)",
  "var(--rarity-legendary)",
  "var(--rarity-rare)",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Avatar({ id, name }: { id: string; name: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 32,
        height: 32,
        flex: "0 0 32px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: AVATAR_COLORS[hash(id) % AVATAR_COLORS.length],
        color: "var(--outline)",
        border: "var(--px) solid var(--outline)",
        fontFamily: "var(--font-display)",
        fontSize: 12,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MemberRow({ member }: { member: PartyMember }) {
  const { t } = useTranslation();
  return (
    <li style={{ justifyContent: "flex-start" }}>
      <Avatar id={member.id} name={member.displayName} />
      <span className="stack" style={{ gap: 2 }}>
        <span className="title">{member.displayName}</span>
        <span className="muted small">
          {member.relation === "invited-you" ? t("party.invitedYou") : t("party.youInvited")}
        </span>
      </span>
    </li>
  );
}

function FeedRow({ entry }: { entry: PartyActivity }) {
  const { t } = useTranslation();
  const name = entry.isMe ? t("party.you") : entry.displayName;
  const item = entry.bestItem;
  return (
    <li style={{ justifyContent: "flex-start", alignItems: "flex-start" }}>
      <Avatar id={entry.userId} name={entry.displayName} />
      <span style={{ flex: 1 }}>
        {t("party.ran", { name, km: (entry.distanceMeters / 1000).toFixed(2), xp: entry.xp })}
        {item && (
          <>
            {" · "}
            {t("party.found")}{" "}
            <strong style={{ color: `var(--rarity-${item.rarity})` }}>
              {t(`party.rarity.${item.rarity}`)} {item.name}
            </strong>
          </>
        )}
      </span>
      <span className="muted small" style={{ whiteSpace: "nowrap" }}>
        {when(entry.createdAt)}
      </span>
    </li>
  );
}

/** Shows who the player is paired with through invites, and what they've been up to. */
export function PartyPanel() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useParty();

  let body;
  if (isPending) {
    body = <p className="muted small">{t("common.loading")}</p>;
  } else if (isError || !data) {
    body = <p className="muted small">{t("party.error")}</p>;
  } else {
    const names = new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(
      data.members.map((m) => m.displayName),
    );
    body = (
      <>
        {data.members.length > 0 ? (
          <>
            <p className="notice success" style={{ margin: 0 }}>
              <strong>{t("party.together", { names })}</strong>
            </p>
            <ul className="list">
              {data.members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </ul>
          </>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <p className="muted" style={{ margin: 0 }}>
              {t("party.empty")}
            </p>
            <Link to="/invites" className="btn secondary">
              {t("party.inviteLink")}
            </Link>
          </div>
        )}
        <h3 style={{ margin: "8px 0 0" }}>{t("party.feedTitle")}</h3>
        {data.feed.length > 0 ? (
          <ul className="list">
            {data.feed.map((e) => (
              <FeedRow key={e.id} entry={e} />
            ))}
          </ul>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            {t("party.feedEmpty")}
          </p>
        )}
      </>
    );
  }

  return (
    <section className="panel stack" aria-labelledby="party-title">
      <h2 id="party-title" style={{ margin: 0 }}>
        {t("party.title")}
      </h2>
      {body}
    </section>
  );
}
