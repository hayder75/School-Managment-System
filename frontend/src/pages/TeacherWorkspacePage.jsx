import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import {
  useSubmissions, useMaterialsBank, useCreateSubmission, useUpdateSubmission,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Upload, Library, Send, RotateCcw } from "lucide-react";

const TYPES = ["test", "exam", "notes", "lesson_plan", "worksheet"];
const STATUS_STYLES = {
  draft: "bg-neutral-100 text-neutral-600",
  submitted: "bg-blue-100 text-blue-700",
  needs_revision: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function TeacherWorkspacePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("mine");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: subsData, isLoading } = useSubmissions({});
  const { data: bankData } = useMaterialsBank({});
  const createSub = useCreateSubmission();
  const updateSub = useUpdateSubmission();

  const subs = subsData?.data || [];
  const bank = bankData?.data || [];

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.submit = payload.submit === "1";
    if (editing) {
      updateSub.mutate({ id: editing.id, ...payload }, { onSuccess: () => { setEditing(null); setDialogOpen(false); } });
    } else {
      createSub.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.workspace.title}</h1>
          <p className="text-muted-foreground">{t.workspace.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" />{t.workspace.newSubmission}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t.workspace.reviseTitle : t.workspace.newSubmission}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="submit" value={editing ? "1" : "0"} />
              <div className="space-y-2">
                <Label>{t.qa.titleCol}</Label>
                <Input name="title" required defaultValue={editing?.title} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.qa.type}</Label>
                  <Select name="type" defaultValue={editing?.type || "test"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t.qa[`type_${ty}`]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.workspace.weekNo}</Label>
                  <Input name="week_number" type="number" min="1" max="40" defaultValue={editing?.week_number} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.workspace.contentBody}</Label>
                <textarea name="body" rows={7} required defaultValue={editing?.body}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t.workspace.bodyPlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.workspace.answerKeyUrl}</Label>
                <Input name="answer_key_url" type="url" placeholder="https://..." defaultValue={editing?.answer_key_url} />
              </div>
              <Button type="submit" className="w-full" disabled={createSub.isPending || updateSub.isPending}>
                {editing ? (<><RotateCcw className="h-4 w-4 mr-2" />{t.workspace.submitRevision}</>) : (<><Send className="h-4 w-4 mr-2" />{t.workspace.submitForReview}</>)}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[["mine", t.workspace.mySubmissions], ["bank", t.workspace.materialsBank]].map(([key, label]) => (
          <Button key={key} variant={tab === key ? "default" : "ghost"} onClick={() => setTab(key)}>{label}</Button>
        ))}
      </div>

      {tab === "mine" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">{t.qa.titleCol}</th>
                  <th className="p-3 font-medium">{t.qa.type}</th>
                  <th className="p-3 font-medium">{t.qa.status}</th>
                  <th className="p-3 font-medium">{t.qa.feedbackHistory}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(subs || []).map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30 align-top">
                    <td className="p-3 font-medium">{s.title}</td>
                    <td className="p-3">{t.qa[`type_${s.type}`]}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[s.status]}`}>{t.qa[s.status]}</span></td>
                    <td className="p-3 max-w-[220px] text-xs text-muted-foreground truncate">{s.review_comment || "—"}</td>
                    <td className="p-3 text-right">
                      {["draft", "needs_revision"].includes(s.status) && (
                        <Button size="sm" variant="outline" onClick={() => { setEditing(s); setDialogOpen(true); }}>
                          {t.workspace.reviseBtn}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !(subs || []).length && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </CardContent>
        </Card>
      )}

      {tab === "bank" && (
        <div className="grid gap-4 sm:grid-cols-2 sm:grid-cols-3">
          {bank.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2 flex-row items-start justify-between">
                <CardTitle className="text-base">{b.title}</CardTitle>
                <Library className="h-4 w-4 text-green-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">{t.qa[`type_${b.type}`]} · {b.class_name || "—"} · {b.subject_name || "—"}</p>
                <p className="text-xs text-muted-foreground mb-3">{t.qa.by}: {b.teacher_name}</p>
                {b.body && <p className="text-xs line-clamp-3 whitespace-pre-wrap border rounded p-2 bg-muted/30 max-h-20 overflow-hidden">{b.body}</p>}
              </CardContent>
            </Card>
          ))}
          {!bank.length && <p className="col-span-full p-8 text-center text-muted-foreground">{t.common.noData}</p>}
        </div>
      )}
    </div>
  );
}
