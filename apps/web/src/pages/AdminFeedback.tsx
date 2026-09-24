import type { FeedbackItem } from "@runhach/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ErrorNotice } from "../components/ErrorNotice";
import { api } from "../lib/api";

export function AdminFeedbackPage() {
  const { t, i18n } = useTranslation();
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: () => api<{ items: FeedbackItem[] }>("/admin/feedback"),
  });

  return (
    <div className="stack">
      <h1>{t("admin.feedbackTitle")}</h1>
      <ErrorNotice error={error} />
      {isPending && <p className="muted">{t("common.loading")}</p>}
      {data?.items.length === 0 && <p className="muted">{t("admin.empty")}</p>}
      {data?.items.map((item) => (
        <article key={item.id} className="panel stack">
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{item.message}</p>
          <div className="muted small">
            {item.userName ?? t("admin.anonymous")} ·{" "}
            {new Date(item.createdAt).toLocaleString(i18n.language)} · {item.route} ·{" "}
            {item.buildVersion}
          </div>
          {item.userAgent && <div className="muted small">{item.userAgent}</div>}
        </article>
      ))}
    </div>
  );
}
