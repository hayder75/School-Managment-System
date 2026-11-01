import { useEffect, useState } from "react";
import { useArchiveExam, useRestoreExam, useDeleteExam } from "../../hooks/useExams";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { classes as sev } from "../../lib/gradeColors";
import { AlertTriangle, Archive, Trash2, RotateCcw } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function DeleteExamDialog({ open, onOpenChange, exam, onDone }) {
  const { t } = useI18n();
  const archive = useArchiveExam();
  const restore = useRestoreExam();
  const remove = useDeleteExam();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
    }
  }, [open]);

  if (!exam) return null;
  const archived = !!exam.archived_at;

  async function handleArchive() {
    setError("");
    try {
      await archive.mutateAsync(exam.id);
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || "Could not archive");
    }
  }

  async function handleRestore() {
    setError("");
    try {
      await restore.mutateAsync(exam.id);
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || "Could not restore");
    }
  }

  async function handleDelete() {
    setError("");
    try {
      await remove.mutateAsync({ id: exam.id, force: true, password });
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || "Could not delete");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{archived ? t("Restore exam") : t("Delete or archive exam")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm">
            <b>{exam.name}</b> · {exam.subject_name} · /{exam.total_marks ?? "—"}
          </p>

          {archived ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("This exam is archived — it stays in the database but is hidden from lists and reports.")}
              </p>
              <Button onClick={handleRestore} disabled={restore.isPending} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" /> {t("Restore exam")}
              </Button>
            </>
          ) : (
            <>
              <div className={`rounded-md border p-3 text-sm ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
                <div className="flex items-center gap-2 font-medium"><Archive className="h-4 w-4" /> {t("Archive (recommended)")}</div>
                <p className="mt-1 text-xs">
                  {t("Hidden from teachers and reports, but all marks and history are kept. You can restore it later.")}
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleArchive} disabled={archive.isPending}>
                  {archive.isPending ? t("Archiving...") : t("Archive exam")}
                </Button>
              </div>

              <div className={`rounded-md border p-3 text-sm ${sev("danger").bg} ${sev("danger").border} ${sev("danger").text}`}>
                <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> {t("Permanently delete")}</div>
                <p className="mt-1 text-xs">
                  {t("This deletes the exam, its grades, approval history and edit requests. The audit log keeps a record of who deleted it. This cannot be undone.")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Enter your account password to confirm. This is checked again on the server.")}
                </p>
                <Input
                  className="mt-2 h-8"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("Your password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                  onClick={handleDelete}
                  disabled={remove.isPending || password.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> {remove.isPending ? t("Deleting...") : t("Delete permanently")}
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
