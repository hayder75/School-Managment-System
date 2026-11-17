import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useSubjects } from "../../hooks/useSubjects";
import {
  useAssessmentTemplates, useSaveAssessmentTemplate, useDeleteAssessmentTemplate,
} from "../../hooks/useMarkSheets";
import { presetFor, primaryPreset, languagePreset } from "../../lib/assessmentPresets";
import MarkSheetConfigDialog from "./MarkSheetConfigDialog";

const LEVELS = [
  { value: "", label: "All levels" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "LKG / UKG" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
];

function scopeLabel(t, tpl) {
  const level = LEVELS.find((l) => l.value === tpl.level_group)?.label || t("All levels");
  return `${level}${tpl.subject_id ? ` · ${tpl.subject_name || ""}` : ` · ${t("all subjects")}`}`;
}

export default function AssessmentSetup() {
  const { t } = useI18n();
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const subjects = subjectsData?.data || [];
  const [levelGroup, setLevelGroup] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const { data: templatesData, isLoading } = useAssessmentTemplates({
    level_group: levelGroup || undefined,
    subject_id: subjectId || undefined,
  });
  const save = useSaveAssessmentTemplate();
  const remove = useDeleteAssessmentTemplate();
  const templates = templatesData?.data || [];

  const subjectById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s.name])),
    [subjects]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", level_group: "primary", subject_id: "", preset: "primary" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function create() {
    setError("");
    if (form.preset === "language" && !form.subject_id) {
      setError(t("Choose the language subject for this plan (for example Amharic or English)."));
      return;
    }
    try {
      const config = form.preset === "language"
        ? languagePreset()
        : form.preset === "kg"
          ? presetFor("kg")
          : primaryPreset();
      const row = await save.mutateAsync({
        name: form.name || t("Assessment plan"),
        level_group: form.level_group || null,
        subject_id: form.subject_id || null,
        config,
      });
      setCreateOpen(false);
      setEditing(row.data);
    } catch (err) {
      setError(err?.error?.message || err?.response?.data?.error?.message || t("Could not create the plan."));
    }
  }

  async function saveConfig(config) {
    if (!editing) return;
    try {
      await save.mutateAsync({
        id: editing.id,
        name: editing.name,
        level_group: editing.level_group || null,
        subject_id: editing.subject_id || null,
        is_default: editing.is_default,
        config,
      });
      setEditing(null);
    } catch (err) {
      setError(err?.error?.message || err?.response?.data?.error?.message || t("Could not save the plan."));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t("Assessment structure")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("Set how marks are combined out of 100 for each level and subject. Reading, writing and speaking are just columns you can add or remove.")}
            </p>
          </div>
          <Button onClick={() => { setForm({ name: "", level_group: "primary", subject_id: "", preset: "primary" }); setCreateOpen(true); setError(""); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("New plan")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={levelGroup} onChange={(e) => setLevelGroup(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{t(l.label)}</option>)}
            </select>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">{t("All subjects")}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
          ) : !templates.length ? (
            <p className="text-sm text-muted-foreground">{t("No plans match this filter. Create one above.")}</p>
          ) : (
            <div className="grid gap-2">
              {templates.map((tpl) => {
                const cfg = tpl.config || {};
                const weight = (cfg.groups || []).reduce((s, g) => s + Number(g.weight_pct || 0), 0);
                return (
                  <div key={tpl.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {tpl.name}
                        {tpl.is_default && <Badge className="ml-2" variant="secondary">{t("Default")}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scopeLabel(t, { ...tpl, subject_name: tpl.subject_id ? subjectById[tpl.subject_id] : "" })}
                        {` · ${(cfg.groups || []).length} ${t("groups")} · ${weight}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(tpl)}>
                        <Settings2 className="h-4 w-4 mr-1" /> {t("Columns & weights")}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm(t("Delete this assessment plan?"))) return;
                          await remove.mutateAsync(tpl.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("New assessment plan")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("Primary language")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("Level")}</Label>
                <select value={form.level_group} onChange={(e) => setForm({ ...form, level_group: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {LEVELS.filter((l) => l.value).map((l) => <option key={l.value} value={l.value}>{t(l.label)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("Subject")}</Label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">{t("All subjects")}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Preset")}</Label>
              <select value={form.preset} onChange={(e) => setForm({ ...form, preset: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="primary">{t("Primary (no language skills)")}</option>
                <option value="language">{t("Primary language (listening, reading, writing, speaking)")}</option>
                <option value="kg">{t("Kindergarten (Test, Mid, Rhyme, Song)")}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t("Cancel")}</Button>
              <Button onClick={create} disabled={save.isPending}>{save.isPending ? t("Creating...") : t("Create")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MarkSheetConfigDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        config={editing?.config}
        levelGroup={editing?.level_group}
        saving={save.isPending}
        onSave={saveConfig}
      />
    </div>
  );
}
