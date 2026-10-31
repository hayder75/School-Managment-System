import { useMemo, useState } from "react";
import {
  useResultSummary, useResultList, useResultDetail, useReviewResult, useAddResultComment,
} from "../../hooks/useResults";
import { useAssessmentTypes } from "../../hooks/useExams";
import { useI18n } from "../../i18n/I18nContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { classes as sev, markSeverity, statusSeverity } from "../../lib/gradeColors";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, ShieldCheck, XCircle, Search } from "lucide-react";

const STATUS_LABEL = {
  draft: "Draft",
  submitted: "Waiting",
  approved: "Approved",
  returned: "Sent back",
  editing: "Editing",
};

export default function ResultApprovals({ enabled = true }) {
  const { t } = useI18n();
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const { data: summaryData } = useResultSummary({ enabled });
  const { data: typeData } = useAssessmentTypes();
  const { data, isLoading } = useResultList({ status, type: type === "all" ? undefined : type }, { enabled });

  const summary = summaryData?.data || { counts: {} };
  const counts = summary.counts || {};
  const rows = data?.data || [];
  const types = typeData?.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.exam_name, r.class_name, r.subject_name, r.teacher_name].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-2"><Clock className="h-7 w-7 text-amber-500" /><div><p className="text-2xl font-bold">{counts.submitted ?? 0}</p><p className="text-xs text-muted-foreground">{t("Waiting for approval")}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-2"><CheckCircle2 className="h-7 w-7 text-emerald-500" /><div><p className="text-2xl font-bold">{counts.approved ?? 0}</p><p className="text-xs text-muted-foreground">{t("Approved")}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-2"><XCircle className="h-7 w-7 text-rose-500" /><div><p className="text-2xl font-bold">{counts.returned ?? 0}</p><p className="text-xs text-muted-foreground">{t("Sent back")}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-blue-500" /><div><p className="text-2xl font-bold">{summary.approval_rate ?? 0}%</p><p className="text-xs text-muted-foreground">{t("Approval rate")}</p></div></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search exam, class or teacher...")} className="pl-9 w-full sm:w-64" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t("Waiting for approval")}</SelectItem>
            <SelectItem value="approved">{t("Approved")}</SelectItem>
            <SelectItem value="returned">{t("Sent back")}</SelectItem>
            <SelectItem value="draft">{t("Draft")}</SelectItem>
            <SelectItem value="all">{t("All")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All types")}</SelectItem>
            {types.map((ty) => <SelectItem key={ty.code} value={ty.code}>{ty.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">{t("Loading...")}</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("Nothing here yet.")}</p>
          ) : (
            <div className="overflow-x-auto -mx-px">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">{t("Exam")}</th>
                    <th className="p-3 font-medium">{t("Class")}</th>
                    <th className="p-3 font-medium">{t("Teacher")}</th>
                    <th className="p-3 font-medium">{t("Progress")}</th>
                    <th className="p-3 font-medium">{t("Status")}</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{r.exam_name}</p>
                        <p className="text-xs text-muted-foreground">{r.subject_name} · {r.exam_type} · /{r.total_marks ?? "—"}</p>
                      </td>
                      <td className="p-3">{r.class_name}</td>
                      <td className="p-3">{r.teacher_name || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded bg-muted">
                            <div className="h-full rounded bg-blue-500" style={{ width: `${r.total_students ? Math.round((r.graded_count / r.total_students) * 100) : 0}%` }} />
                          </div>
                          <span className="text-xs">{r.graded_count}/{r.total_students}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={sev(statusSeverity(r.status)).badge}>{t(STATUS_LABEL[r.status] || r.status)}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>{t("Open")}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResultDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ResultDetailDialog({ id, onClose }) {
  const { t } = useI18n();
  const { data, isLoading } = useResultDetail(id);
  const review = useReviewResult();
  const addComment = useAddResultComment();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const payload = data?.data;
  const sub = payload?.submission;
  const students = payload?.students || [];
  const warnings = payload?.warnings || {};
  const history = payload?.history || [];
  const comments = payload?.comments || [];
  const total = sub?.total_marks != null ? Number(sub.total_marks) : null;
  const pass = sub?.pass_marks != null ? Number(sub.pass_marks) : null;

  async function act(decision) {
    setError("");
    try {
      await review.mutateAsync({ id, decision, comment: comment.trim() || null });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not save the decision");
    }
  }

  async function sendComment() {
    if (!comment.trim()) return;
    await addComment.mutateAsync({ id, comment: comment.trim() });
    setComment("");
  }

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sub ? `${sub.exam_name} · ${sub.class_name}` : t("Results")}</DialogTitle>
        </DialogHeader>

        {isLoading || !payload ? (
          <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge className={sev(statusSeverity(sub.status)).badge}>{t(STATUS_LABEL[sub.status] || sub.status)}</Badge>
              <span className="text-muted-foreground">{sub.subject_name} · /{sub.total_marks ?? "—"} · {t("pass")} {sub.pass_marks ?? "—"}</span>
              <span className="text-muted-foreground">{t("Teacher")}: {sub.teacher_name || "—"}</span>
              {sub.reviewer_name && <span className="text-muted-foreground">{t("Reviewed by")} {sub.reviewer_name}</span>}
            </div>

            {(warnings.missing > 0 || warnings.exceeded > 0) && (
              <div className={`rounded-md border p-2 text-xs ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                {warnings.missing > 0 && `${warnings.missing} ${t("student(s) have no mark")}. `}
                {warnings.exceeded > 0 && `${warnings.exceeded} ${t("mark(s) exceed the total")}.`}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">{t("Student")}</th>
                    <th className="p-2 font-medium">{t("Mark")}</th>
                    <th className="p-2 font-medium">{t("Grade")}</th>
                    <th className="p-2 font-medium">{t("Updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const key = markSeverity(s.marks_obtained, total, pass);
                    return (
                      <tr key={s.student_id} className={`border-b ${key === "danger" ? sev("danger").bg : ""}`}>
                        <td className="p-2">{[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ")}<span className="block text-xs text-muted-foreground">{s.student_number}</span></td>
                        <td className={`p-2 font-medium ${key === "danger" ? sev("danger").text : key === "warn" ? sev("warn").text : key === "good" ? sev("good").text : ""}`}>
                          {s.marks_obtained ?? "—"}
                        </td>
                        <td className="p-2">{s.grade_letter || "—"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {history.length > 0 && (
              <details className="rounded-md border p-2 text-xs">
                <summary className="cursor-pointer font-medium">{t("Change history")} ({history.length})</summary>
                <div className="mt-2 space-y-1">
                  {history.slice(0, 40).map((h) => (
                    <div key={h.id} className="flex flex-wrap gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{h.student_name}</span>
                      <span>{h.old_marks ?? "—"} → {h.new_marks ?? "—"}</span>
                      <span>{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium"><MessageSquare className="inline h-4 w-4 mr-1" />{t("Comments")}</p>
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("No comments yet.")}</p>
              ) : (
                <div className="space-y-1">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded border p-2 text-xs">
                      <p className="font-medium">{c.author_name} <span className="text-muted-foreground">({c.author_role})</span></p>
                      <p>{c.comment || c.action}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("Add a comment...")} />
                <Button variant="outline" size="sm" onClick={sendComment} disabled={!comment.trim() || addComment.isPending}>{t("Send")}</Button>
              </div>
            </div>

            {["submitted", "approved"].includes(sub.status) && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button onClick={() => act("approve")} disabled={review.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> {t("Approve")}
                </Button>
                <Button variant="outline" onClick={() => act("return")} disabled={review.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> {t("Send back")}
                </Button>
                {error && <p className="text-xs text-rose-600">{error}</p>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
