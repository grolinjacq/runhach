import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="stack center">
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.body")}</p>
      <Link to="/" className="btn">
        {t("notFound.home")}
      </Link>
    </div>
  );
}
