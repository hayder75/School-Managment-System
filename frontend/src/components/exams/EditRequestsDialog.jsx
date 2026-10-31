import { useState } from "react";
import { useEditRequests, useDecideEditRequest } from "../../hooks/useResults";
import { useAuthStore } from "../../store/auth";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { classes as sev, statusSeverity } from "../../lib/gradeColors";
import { Check, X, Clock, ShieldCheck, UserCheck } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function EditRequestsDialog({ open, onOpenChange, examId }) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState("pending");
  const { data, isLoading } = useEditRequests({ status, exam_id: examId }, { enabled: open });
  const decide = useDecideEditRequest();
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");

  const rows = data?.data || [];
  const isOwner = ["owner", "admin"].includes(user?.role);
  const isQa = ["quality_director", "principal", "vice_principal", "general_manager"].includes(user?.role);

  async function act(row, decision) {
    setError("");
    try {
      await decide.mutateAsync({ id: row.id, decision, note: notes[row.id] || null });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not update the request");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Mark edit requests")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
              {t(s === "pending" ? "Open requests" : s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "All")}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No edit requests here.")}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const needsOwner = !r.owner_approved_at && !["approved", "rejected", "expired", "used"].includes(r.status);
              const needsQa = !r.qa_approved_at && !["approved", "rejected", "expired", "used"].includes(r.status);
              return (
                <div key={r.id} className={`rounded-md border p-3 ${sev(statusSeverity(r.status)).border}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{r.exam_name} · {r.class_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.student_name ? `${t("Student")}: ${r.student_name} · ` : `${t("Whole section")} · `}
                        {t("by")} {r.teacher_name}
                      </p>
                      <p className="mt-1 text-xs"><b>{t("Reason")}:</b> {r.reason}</p>
                    </div>
                    <Badge className={sev(statusSeverity(r.status)).badge}>
                      {t(r.status === "partially_approved" ? "Partially approved" : r.status)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <span className={r.owner_approved_at ? sev("good").text : "text-muted-foreground"}>
                      <UserCheck className="inline h-3.5 w-3.5 mr-1" />
                      {r.owner_approved_at ? `${t("Owner/admin")}: ${r.owner_approver_name || t("approved")}` : t("Owner approval pending")}
                    </span>
                    <span className={r.qa_approved_at ? sev("good").text : "text-muted-foreground"}>
                      <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />
                      {r.qa_approved_at ? `${t("QA")}: ${r.qa_approver_name || t("approved")}` : t("QA approval pending")}
                    </span>
                    {r.reject_note && <span className={sev("danger").text}>{t("Rejected")}: {r.reject_note}</span>}
                  </div>

                  {!["approved", "rejected", "expired", "used"].includes(r.status) && (isOwner || isQa) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        className="h-8 max-w-xs"
                        placeholder={t("Note (optional)")}
                        value={notes[r.id] || ""}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      />
                      {((isOwner && needsOwner) || (isQa && needsQa)) && (
                        <Button size="sm" onClick={() => act(r, "approve")} disabled={decide.isPending}>
                          <Check className="h-4 w-4 mr-1" />
                          {isOwner && needsOwner ? t("Approve as owner") : t("Approve as QA")}
                        </Button>
                      )}
                      {(isOwner || isQa) && (
                        <Button size="sm" variant="outline" onClick={() => act(r, "reject")} disabled={decide.isPending}>
                          <X className="h-4 w-4 mr-1" /> {t("Reject")}
                        </Button>
                      )}
                      {r.status !== "used" && r.expires_at && (
                        <span className="text-[11px] text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />{t("expires")} {new Date(r.expires_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
