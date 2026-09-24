import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";

/** Shows a toast when a new version of the app has been downloaded. */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="toast panel row" role="status">
      <span className="spacer">{t("pwa.updateAvailable")}</span>
      <button type="button" className="btn small secondary" onClick={() => setNeedRefresh(false)}>
        {t("pwa.dismiss")}
      </button>
      <button type="button" className="btn small" onClick={() => void updateServiceWorker(true)}>
        {t("pwa.update")}
      </button>
    </div>
  );
}
