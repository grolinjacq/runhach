import { useTranslation } from "react-i18next";
import { APP_VERSION, BUILD_TIME } from "../config";

export function VersionBadge() {
  const { t } = useTranslation();
  return (
    <span className="version" title={BUILD_TIME}>
      {t("feedback.build", { version: APP_VERSION })}
    </span>
  );
}
