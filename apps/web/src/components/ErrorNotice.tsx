import { useTranslation } from "react-i18next";
import { describeError } from "../lib/auth";

export function ErrorNotice({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const described = describeError(error);
  return (
    <p className="notice error" role="alert">
      {"key" in described ? t(described.key) : described.message}
    </p>
  );
}
