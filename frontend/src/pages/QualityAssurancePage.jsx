import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../i18n/I18nContext";
import api from "../lib/api";
import {
  useSubmissions, useSubmissionSummary, useMaterialsBank,
  useReviewSubmission, useToggleBank, useSubmission,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { FileCheck2, Library, ClipboardList, Star } from "lucide-react";

const TYPES = ["test", "exam", "notes", "lesson_plan", "worksheet"];
const STATUS_STYLES = {
  submitted: "bg-blue-100 text-blue-700",
  needs_revision: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  draft: "bg-neutral-100 text-neutral-600",
};

export default function QualityAssurancePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("review");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewingId, setReviewingId] = useState(null);

  const { data: subsData } = useSubmissions({ status: statusFilter, type: typeFilter });
  const { data: summary } = useSubmissionSummary();
  const { data: bankData } = useMaterialsBank(typeFilter !== "all" ? { type: typeFilter } : {});
  const review = useReviewSubmission();
  const toggleBank = useToggleBank();

  const subs = subsData?.data || [];
  const bank = bankData?.data || [];
  const counts = summary?.data?.counts || {};
  const rubricAvg = summary?.data?.counts || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.qa.title}</h1>
        <p className="text-muted-foreground">{t.qa.subtitle}</p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileCheck2 className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{counts.pending_review ?? 0}</p><p className="text-xs text-muted-foreground">{t.qa.pendingReview}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ClipboardList className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">{counts.needs_revision ?? 0}</p><p className="text-xs text-muted-foreground">{t.qa.needsRevision}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Library className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{counts.approved ?? 0}</p><p className="text-xs text-muted-foreground">{t.qa.approved}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Star className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">
          {((Number(rubricAvg.avg_alignment) + Number(rubricAvg.avg_difficulty) + Number(rubricAvg.avg_clarity) + Number(rubricAvg.avg_answer_key)) / 4).toFixed(2)}
        </p><p className="text-xs text-muted-foreground">{t.qa.avgRubricScore}</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {[["review", t.qa.reviewCenter], ["bank", t.qa.materialsBank], ["report", t.qa.reportTab]].map(([key, label]) => (
          <Button key={key} variant={tab === key ? "default" : "ghost"} onClick={() => setTab(key)}>{label}</Button>
        ))}
      </div>

      {(tab === "review" || tab === "bank") && (
        <div className="flex flex-wrap items-center gap-3">
          {tab === "review" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.qa.allStatuses}</SelectItem>
                <SelectItem value="pending">{t.qa.filterPending}</SelectItem>
                <SelectItem value="submitted">{t.qa.submitted}</SelectItem>
                <SelectItem value="needs_revision">{t.qa.changesRequested}</SelectItem>
                <SelectItem value="approved">{t.qa.approved}</SelectItem>
                <SelectItem value="rejected">{t.qa.rejected}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder={t.qa.type} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.qa.allTypes}</SelectItem>
              {TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t.qa[`type_${ty}`]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {tab === "review" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">{t.qa.titleCol}</th>
                  <th className="p-3 font-medium">{t.qa.type}</th>
                  <th className="p-3 font-medium">{t.qa.teacher}</th>
                  <th className="p-3 font-medium">{t.qa.status}</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.title}</td>
                    <td className="p-3">{t.qa[`type_${s.type}`] || s.type}</td>
                    <td className="p-3">{s.teacher_name}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s.status] || ""}`}>{t.qa[s.status] || s.status}</span></td>
                    <td className="p-3 text-right"><Button size="sm" onClick={() => setReviewingId(s.id)}>{t.qa.openReview}</Button></td>
                  </tr>
                ))}
                {!subs.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
              </tbody>
            </table></div>
          </CardContent>
        </Card>
      )}

      {tab === "bank" && (
        <div className="grid gap-4 sm:grid-cols-2 sm:grid-cols-3">
          {bank.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{b.title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">{t.qa[`type_${b.type}`]} · {b.class_name || "—"} · {b.subject_name || "—"}</p>
                <p className="text-xs text-muted-foreground mb-3">{t.qa.by}: {b.teacher_name}</p>
                <div className="flex items-center justify-between">
                  {b.is_banked ? <Badge className="bg-green-100 text-green-700">{t.qa.inBank}</Badge> : <Badge variant="outline">{t.qa.notInBank}</Badge>}
                  {!b.is_banked && (
                    <Button size="sm" variant="outline" disabled={toggleBank.isPending}
                      onClick={() => toggleBank.mutate({ id: b.id, banked: true })}>
                      {t.qa.addToBank}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!bank.length && <p className="col-span-full p-8 text-center text-muted-foreground">{t.common.noData}</p>}
        </div>
      )}

      {tab === "report" && <QualityReport summary={summary?.data} />}

      <ReviewDialog id={reviewingId} onClose={() => setReviewingId(null)} />
    </div>
  );
}

function QualityReport({ summary }) {
  const { t } = useI18n();
  if (!summary) return null;
  const counts = summary.counts || {};
  const total = (counts.approved || 0) + (counts.needs_revision || 0) + (counts.rejected || 0) + (counts.submitted || 0);
  const approvalRate = total ? Math.round(((counts.approved || 0) / total) * 100) : 0;
  const byTeacher = (summary.byTeacher || []).map((r) => ({
    ...r,
    rate: r.total ? Math.round((r.approved / r.total) * 100) : 0,
  }));
  const byType = summary.byType || [];
  const maxType = Math.max(...byType.map((r) => Number(r.count)), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">{t.qa.reportTotalReviewed}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{approvalRate}%</p><p className="text-xs text-muted-foreground">{t.qa.reportApprovalRate}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-blue-600">{counts.pending_review ?? counts.submitted ?? 0}</p><p className="text-xs text-muted-foreground">{t.qa.pendingReview}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-purple-600">{bankedCount(summary)}</p><p className="text-xs text-muted-foreground">{t.qa.materialsBank}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t.qa.reportByTeacher}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">{t.qa.teacher}</th>
                <th className="py-2 font-medium">{t.qa.reportSubmittedCol}</th>
                <th className="py-2 font-medium">{t.qa.approved}</th>
                <th className="py-2 font-medium">{t.qa.reportApprovalRate}</th>
              </tr></thead>
              <tbody>
                {byTeacher.map((r) => (
                  <tr key={r.teacher_id} className="border-b last:border-0">
                    <td className="py-2">{r.teacher_name}</td>
                    <td className="py-2">{r.total}</td>
                    <td className="py-2">{r.approved}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded bg-neutral-100 max-w-[100px]">
                          <div className={`h-full rounded ${r.rate >= 70 ? "bg-green-500" : r.rate >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${r.rate}%` }} />
                        </div>
                        <span className="text-xs font-medium">{r.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!byTeacher.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">{t.common.noData}</td></tr>}
              </tbody>
            </table></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t.qa.reportByType}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byType.map((r) => (
              <div key={r.type}>
                <div className="flex justify-between text-xs mb-1"><span>{t.qa[`type_${r.type}`] || r.type}</span><span className="font-medium">{r.count}</span></div>
                <div className="h-2 rounded bg-neutral-100"><div className="h-full rounded bg-neutral-900" style={{ width: `${(Number(r.count) / maxType) * 100}%` }} /></div>
              </div>
            ))}
            {!byType.length && <p className="py-4 text-sm text-muted-foreground">{t.common.noData}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function bankedCount(summary) {
  // banked items are approved & flagged; approximate via approved count in bank query
  return summary?.counts?.approved ?? 0;
}

function ReviewDialog({ id, onClose }) {
  const { t } = useI18n();
  const { data } = useSubmission(id);
  const review = useReviewSubmission();
  const [comment, setComment] = useState("");
  const [scores, setScores] = useState({ alignment: 5, difficulty: 4, clarity: 5, answer_key: 5 });

  const sub = data?.data;
  if (!id) return null;

  function decide(decision) {
    review.mutate(
      { id, decision, comment: decision === "approve" && !comment ? t.qa.defaultApproveComment : comment, rubric_scores: scores, bank: decision === "approve" },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{sub?.title || "..."}</DialogTitle></DialogHeader>
        {sub && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 min-h-[160px] whitespace-pre-wrap text-sm">
                {sub.body || t.qa.noBodyText}
              </div>
              <dl className="text-xs space-y-1 text-muted-foreground">
                <div>{t.qa.teacher}: <strong className="text-neutral-800">{sub.teacher_name}</strong></div>
                <div>{t.qa.typeLabel}: {t.qa[`type_${sub.type}`]}</div>
                <div>{t.qa.classCol}: {sub.class_name || "—"} · {t.qa.subject}: {sub.subject_name || "—"}</div>
                {sub.answer_key_url && <div className="break-all">🔗 {sub.answer_key_url}</div>}
              </dl>
              {sub.comments?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">{t.qa.feedbackHistory}</p>
                  {sub.comments.map((c) => (
                    <div key={c.id} className="rounded border p-2 text-xs">
                      <span className="font-semibold">{c.author_name}</span>
                      <span className="text-muted-foreground"> · {new Date(c.created_at).toLocaleDateString()}</span>
                      <p className="mt-1">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">{t.qa.rubricTitle}</p>
                {[["alignment", t.qa.rubAlignment], ["difficulty", t.qa.rubDifficulty], ["clarity", t.qa.rubClarity], ["answer_key", t.qa.rubAnswerKey]].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium flex justify-between"><span>{label}</span><span>{scores[key]}/5</span></label>
                    <input type="range" min="1" max="5" value={scores[key]}
                      onChange={(e) => setScores({ ...scores, [key]: Number(e.target.value) })}
                      className="w-full accent-neutral-900" />
                  </div>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.qa.commentPlaceholder}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="destructive" disabled={review.isPending} onClick={() => decide("request_changes")}>{t.qa.requestChanges}</Button>
                <Button disabled={review.isPending} onClick={() => decide("approve")}>{t.qa.approveBtn}</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
