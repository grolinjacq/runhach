import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isIos, isStandalone } from "../lib/device-checks";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const DISMISS_KEY = "runhach.installDismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Offers "Install app" (Android/desktop) or explains Add to Home Screen (iOS). */
export function InstallBanner() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: the banner just comes back next time.
    }
  };

  if (hidden || (!promptEvent && !isIos())) return null;
  return (
    <div className="panel row small" style={{ marginTop: 16 }}>
      <span className="spacer">{promptEvent ? t("app.tagline") : t("pwa.iosInstall")}</span>
      <button type="button" className="btn small secondary" onClick={dismiss}>
        {t("pwa.dismiss")}
      </button>
      {promptEvent && (
        <button
          type="button"
          className="btn small"
          onClick={() => void promptEvent.prompt().then(() => setPromptEvent(null))}
        >
          {t("pwa.install")}
        </button>
      )}
    </div>
  );
}
