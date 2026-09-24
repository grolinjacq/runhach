import { levelFromTotalXp, type GearStats, type LootItem } from "@runhach/game";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ItemSprite } from "../components/Sprites";
import { useProgress } from "../lib/progress";

const STAT_KEYS: ReadonlyArray<keyof GearStats> = ["strength", "dexterity", "intellect", "luck"];

function ItemCard({ item }: { item: LootItem }) {
  const { t } = useTranslation();
  const stats = STAT_KEYS.filter((key) => item.stats[key] !== 0);
  return (
    <li
      className="panel stack"
      style={{ margin: 0, gap: 4, borderColor: `var(--rarity-${item.rarity})` }}
    >
      <div className="center" style={{ marginBottom: 6 }}>
        <ItemSprite item={item} size={72} />
      </div>
      <strong style={{ color: `var(--rarity-${item.rarity})` }}>{item.name}</strong>
      <span className="small muted">
        {t(`inventory.rarity.${item.rarity}`)} · {t(`inventory.slot.${item.slot}`)}
      </span>
      {stats.length > 0 && (
        <span className="small">
          {stats.map((key) => `+${item.stats[key]} ${t(`inventory.stat.${key}`)}`).join("  ")}
        </span>
      )}
      <span className="small muted">{t("inventory.foundAtKm", { km: item.foundAtKm })}</span>
    </li>
  );
}

export function InventoryPage() {
  const { t } = useTranslation();
  const progress = useProgress();
  const { level, xpIntoLevel, xpForNextLevel } = levelFromTotalXp(progress.totalXp);
  const totalMeters = progress.runs.reduce((sum, run) => sum + run.distanceMeters, 0);
  const items = [...progress.items].reverse();

  return (
    <div className="stack">
      <h1>{t("inventory.title")}</h1>

      <div className="panel stats">
        <div className="stat">
          <span className="label">{t("inventory.level", { level })}</span>
          <span className="value">
            {t("inventory.xp", { current: xpIntoLevel, next: xpForNextLevel })}
          </span>
        </div>
        <div className="stat">
          <span className="label">{t("inventory.totalKm")}</span>
          <span className="value">
            {t("inventory.km", { km: (totalMeters / 1000).toFixed(1) })}
          </span>
        </div>
        <div className="stat">
          <span className="label">{t("inventory.runs")}</span>
          <span className="value">{progress.runs.length}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="panel stack">
          <p className="muted">{t("inventory.empty")}</p>
          <Link className="btn block" to="/run">
            {t("inventory.startRun")}
          </Link>
        </div>
      ) : (
        <>
          <h2>{t("inventory.items", { count: items.length })}</h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
