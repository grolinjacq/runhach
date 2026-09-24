import type { Invite } from "@runhach/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorNotice } from "../components/ErrorNotice";
import { api } from "../lib/api";

export function InvitesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const { data, error } = useQuery({
    queryKey: ["invites"],
    queryFn: () => api<{ invites: Invite[]; limit: number | null }>("/invites"),
  });
  const create = useMutation({
    mutationFn: () => api<Invite>("/invites", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  const share = async (code: string) => {
    const url = `${window.location.origin}/signup?invite=${code}`;
    const text = t("invites.shareText", { code, url });
    if (navigator.share) {
      await navigator.share({ text }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(code);
    } catch {
      window.prompt(t("invites.copy"), text);
    }
  };

  const canCreate = data && (data.limit === null || data.invites.length < data.limit);

  return (
    <div className="stack">
      <h1>{t("invites.title")}</h1>
      <p>{t("invites.body")}</p>
      {data && (
        <p className="muted small">
          {data.limit === null
            ? t("invites.unlimited")
            : t("invites.limit", { used: data.invites.length, limit: data.limit })}
        </p>
      )}
      <button
        type="button"
        className="btn block"
        disabled={!canCreate || create.isPending}
        onClick={() => create.mutate()}
      >
        {t("invites.create")}
      </button>
      <ErrorNotice error={error ?? create.error} />

      {data && data.invites.length === 0 && <p className="muted">{t("invites.none")}</p>}
      <ul className="list">
        {data?.invites.map((invite) => (
          <li key={invite.code}>
            <div>
              <div className="code">{invite.code}</div>
              <div className="muted small">
                {invite.usedAt
                  ? invite.usedByName
                    ? t("invites.usedBy", { name: invite.usedByName })
                    : t("invites.used")
                  : t("invites.unused")}
              </div>
            </div>
            {!invite.usedAt && (
              <button
                type="button"
                className="btn small secondary"
                onClick={() => void share(invite.code)}
              >
                {copied === invite.code ? t("invites.copied") : t("invites.share")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
