import { useState } from "react";
import {
  useAssessmentTypes, useCreateAssessmentType, useUpdateAssessmentType, useDeleteAssessmentType,
} from "../../hooks/useExams";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ArrowDown, ArrowUp, Plus, Trash2, RotateCcw } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function AssessmentTypesDialog({ open, onOpenChange }) {
  const { t } = useI18n();
  const { data } = useAssessmentTypes({ include_inactive: true });
  const create = useCreateAssessmentType();
  const update = useUpdateAssessmentType();
  const remove = useDeleteAssessmentType();

  const types = data?.data || [];
  const [newType, setNewType] = useState({ name: "", default_total_marks: "", default_pass_marks: "" });
  const [error, setError] = useState("");

  async function addType(e) {
    e.preventDefault();
    setError("");
    if (!newType.name.trim()) return;
    try {
      await create.mutateAsync({
        name: newType.name.trim(),
        default_total_marks: newType.default_total_marks === "" ? null : Number(newType.default_total_marks),
        default_pass_marks: newType.default_pass_marks === "" ? null : Number(newType.default_pass_marks),
      });
      setNewType({ name: "", default_total_marks: "", default_pass_marks: "" });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not add the type");
    }
  }

  function move(index, dir) {
    const current = types[index];
    const swapWith = types[index + dir];
    if (!swapWith) return;
    update.mutate({ id: current.id, sort_order: swapWith.sort_order });
    update.mutate({ id: swapWith.id, sort_order: current.sort_order });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Assessment types")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          {t("These are the options teachers see when they create an exam. Defaults fill the marks automatically.")}
        </p>

        <div className="divide-y rounded-md border">
          {types.map((ty, i) => (
            <div key={ty.id} className="flex flex-wrap items-center gap-2 p-2">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === types.length - 1} className="text-muted-foreground disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <Input
                className="h-8 max-w-[180px]"
                defaultValue={ty.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== ty.name) update.mutate({ id: ty.id, name });
                }}
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>/</span>
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={ty.default_total_marks ?? ""}
                  onBlur={(e) => update.mutate({ id: ty.id, default_total_marks: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <span>{t("pass")}</span>
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={ty.default_pass_marks ?? ""}
                  onBlur={(e) => update.mutate({ id: ty.id, default_pass_marks: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <Badge variant="outline" className="text-[10px]">
                {ty.exams_count} {t("exams")}
              </Badge>
              {!ty.is_active && <Badge className="bg-muted text-muted-foreground text-[10px]">{t("hidden")}</Badge>}
              <div className="ml-auto flex gap-1">
                {ty.is_active ? (
                  <Button size="icon" variant="ghost" title={t("Hide from teachers")} onClick={() => update.mutate({ id: ty.id, is_active: false })}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" title={t("Show again")} onClick={() => update.mutate({ id: ty.id, is_active: true })}>
                    <RotateCcw className="h-4 w-4 text-emerald-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!types.length && <p className="p-4 text-sm text-muted-foreground">{t("No assessment types yet.")}</p>}
        </div>

        <form onSubmit={addType} className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">{t("Add a new type")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Name")}</Label>
              <Input
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder={t("e.g. Oral test")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Default total")}</Label>
              <Input
                type="number"
                value={newType.default_total_marks}
                onChange={(e) => setNewType({ ...newType, default_total_marks: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Default pass")}</Label>
              <Input
                type="number"
                value={newType.default_pass_marks}
                onChange={(e) => setNewType({ ...newType, default_pass_marks: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <Button type="submit" size="sm" disabled={create.isPending || !newType.name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> {t("Add type")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
