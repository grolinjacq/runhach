import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorNotice } from "../components/ErrorNotice";
import { CHECK_ORDER, runCheck, type CheckId, type CheckResult } from "../lib/device-checks";
import { sendFeedback } from "../lib/feedback";

const idle = (): Record<CheckId, CheckResult> =>
  Object.fromEntries(CHECK_ORDER.map((id) => [id, { status: "idle" }])) as Record<
    CheckId,
    CheckResult
  >;

export function DeviceCheckPage() {
  const { t } = useTranslation();
  const [results, setResults] = useState(idle);
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Must start from a tap: browsers only allow sound, speech and wake lock after a gesture.
  const runAll = async () => {
    setRunning(true);
    setSent(false);
    setResults(idle());
    for (const id of CHECK_ORDER) {
      setResults((r) => ({ ...r, [id]: { status: "pending" } }));
      const result = await runCheck(id);
      setResults((r) => ({ ...r, [id]: result }));
    }
    setRunning(false);
  };

  const done = CHECK_ORDER.every((id) => !["idle", "pending"].includes(results[id].status));

  const send = async () => {
    setError(null);
    try {
      const summary = CHECK_ORDER.map((id) => `${id}: ${results[id].status}`).join(", ");
      await sendFeedback(`Device check: ${summary}`, {
        deviceCheck: results,
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
      });
      setSent(true);
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="stack">
      <h1>{t("deviceCheck.title")}</h1>
      <p className="muted">{t("deviceCheck.intro")}</p>
      <button type="button" className="btn block" onClick={runAll} disabled={running}>
        {running ? t("deviceCheck.running") : t("deviceCheck.run")}
      </button>

      <ul className="list" aria-live="polite">
        {CHECK_ORDER.map((id) => {
          const result = results[id];
          return (
            <li key={id} data-check={id} data-status={result.status}>
              <div>
                <div className="title">{t(`deviceCheck.checks.${id}`)}</div>
                {result.detail && (
                  <div className="muted small">
                    {t(`deviceCheck.details.${result.detail}`, result.params)}
                  </div>
                )}
              </div>
              <span className={`status ${result.status}`}>
                {t(`deviceCheck.status.${result.status}`)}
              </span>
            </li>
          );
        })}
      </ul>

      {done && !sent && (
        <button type="button" className="btn block secondary" onClick={send}>
          {t("deviceCheck.send")}
        </button>
      )}
      {sent && <p className="notice success">{t("deviceCheck.sent")}</p>}
      <ErrorNotice error={error} />
    </div>
  );
}
