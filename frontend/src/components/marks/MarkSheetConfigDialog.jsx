import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function clone(config) {
  return JSON.parse(JSON.stringify(config || { groups: [] }));
}

function newCode(prefix, existing) {
  let i = 1;
  let code = `${prefix}_${i}`;
  while (existing.has(code)) { i += 1; code = `${prefix}_${i}`; }
  return code;
}

export default function MarkSheetConfigDialog({ open, onOpenChange, config, onSave, saving, levelGroup }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => clone(config));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(clone(config));
      setError("");
    }
  }, [open, config]);

  const total = useMemo(
    () => Math.round((draft.groups || []).reduce((s, g) => s + Number(g.weight_pct || 0), 0) * 10) / 10,
    [draft]
  );

  function patchGroup(index, patch) {
    setDraft((d) => ({ ...d, groups: d.groups.map((g, i) => (i === index ? { ...g, ...patch } : g)) }));
  }

  function patchComponent(gi, ci, patch) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => (i !== gi ? g : {
        ...g,
        components: g.components.map((c, j) => (j === ci ? { ...c, ...patch } : c)),
      })),
    }));
  }

  function addGroup() {
    setDraft((d) => {
      const existing = new Set((d.groups || []).map((g) => g.code));
      const code = newCode("group", existing);
      return {
        ...d,
        groups: [...(d.groups || []), {
          code,
          name: t("New group"),
          weight_pct: 0,
          is_final: false,
          components: [{ code: newCode("item", new Set()), name: t("New column"), max_marks: 10, input_type: "number" }],
        }],
      };
    });
  }

  function removeGroup(gi) {
    setDraft((d) => {
      const removed = d.groups[gi];
      const groups = d.groups.filter((_, i) => i !== gi);
      if (!groups.length) return { ...d, groups };
      // Keep the plan at 100% by sharing the removed group's weight.
      const share = Number(removed?.weight_pct || 0) / groups.length;
      const next = groups.map((g) => ({ ...g, weight_pct: Math.round((Number(g.weight_pct || 0) + share) * 10) / 10 }));
      const total = next.reduce((s, g) => s + g.weight_pct, 0);
      next[next.length - 1].weight_pct = Math.round((next[next.length - 1].weight_pct + (100 - total)) * 10) / 10;
      return { ...d, groups: next };
    });
  }

  function addComponent(gi) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => {
        if (i !== gi) return g;
        const existing = new Set(g.components.map((c) => c.code));
        return {
          ...g,
          components: [...g.components, {
            code: newCode("item", existing),
            name: t("New column"),
            max_marks: 10,
            input_type: "number",
          }],
        };
      }),
    }));
  }

  function removeComponent(gi, ci) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => (i === gi ? { ...g, components: g.components.filter((_, j) => j !== ci) } : g)),
    }));
  }

  function submit() {
    if (Math.abs(total - 100) > 0.1) {
      setError(t("Weights must total 100. They currently total {total}.", { total }));
      return;
    }
    const codes = new Set();
    for (const g of draft.groups) {
      for (const c of g.components) {
        if (codes.has(c.code)) { setError(t("Two columns have the same code: {code}", { code: c.code })); return; }
        codes.add(c.code);
      }
    }
    setError("");
    const clean = {
      ...draft,
      pass_pct: Number(draft.pass_pct ?? 50),
      groups: (draft.groups || []).map((g) => ({
        ...g,
        weight_pct: Number(g.weight_pct || 0),
        is_final: !!g.is_final,
        components: (g.components || []).map((c) => ({
          ...c,
          max_marks: c.input_type === "text" ? undefined : Number(c.max_marks || 0),
        })),
      })),
    };
    onSave(clean);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Assessment columns & weights")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("Add as many columns as you need. Each group has a weight out of 100; the marks inside a group are combined by their maximum marks.")}
            {levelGroup === "kg" || levelGroup === "nursery" ? ` ${t("Kindergarten sheets usually use Test, Mid, Rhyme and Song.")}` : ""}
          </p>

          {draft.groups.map((group, gi) => (
            <div key={group.code + gi} className="rounded-lg border p-3 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <Label>{t("Group name")}</Label>
                  <Input value={group.name} onChange={(e) => patchGroup(gi, { name: e.target.value })} />
                </div>
                <div className="w-28">
                  <Label>{t("Weight %")}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={group.weight_pct}
                    onChange={(e) => patchGroup(gi, { weight_pct: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                </div>
                <label className="flex items-center gap-1 pb-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!group.is_final}
                    onChange={(e) => patchGroup(gi, { is_final: e.target.checked })}
                  />
                  {t("Final exam group")}
                </label>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeGroup(gi)} title={t("Remove group")}>
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>

              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">{t("Column name")}</th>
                      <th className="p-2 text-left font-medium w-28">{t("Max marks")}</th>
                      <th className="p-2 text-left font-medium w-32">{t("Input")}</th>
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.components.map((comp, ci) => (
                      <tr key={comp.code + ci} className="border-t">
                        <td className="p-1.5">
                          <Input value={comp.name} onChange={(e) => patchComponent(gi, ci, { name: e.target.value })} className="h-8" />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={comp.max_marks}
                            disabled={comp.input_type === "text"}
                            onChange={(e) => patchComponent(gi, ci, { max_marks: e.target.value === "" ? "" : Number(e.target.value) })}
                            className="h-8"
                          />
                        </td>
                        <td className="p-1.5">
                          <select
                            value={comp.input_type || "number"}
                            onChange={(e) => patchComponent(gi, ci, { input_type: e.target.value })}
                            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="number">{t("Number")}</option>
                            <option value="text">{t("Text")}</option>
                          </select>
                        </td>
                        <td className="p-1.5 text-right">
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeComponent(gi, ci)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button type="button" size="sm" variant="outline" onClick={() => addComponent(gi)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {t("Add column")}
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addGroup}>
            <Plus className="h-4 w-4 mr-1" /> {t("Add group")}
          </Button>

          <div className={`flex items-center justify-between rounded-md border p-3 text-sm ${Math.abs(total - 100) > 0.1 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
            <span className="flex items-center gap-2">
              {Math.abs(total - 100) > 0.1 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("Total weight")}: <b>{total}%</b>
            </span>
            <Badge variant={Math.abs(total - 100) > 0.1 ? "destructive" : "success"}>
              {Math.abs(total - 100) > 0.1 ? t("Must be 100") : t("Ready")}
            </Badge>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("Cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? t("Saving...") : t("Save columns")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
