import { useState } from "react";
import {
  usePerformanceCriteria, useCreateCriteria, useUpdateCriteria, useDeleteCriteria,
  usePerformanceMonthly, useSavePerformanceReview,
} from "../hooks/usePerformance";
import { useToast } from "../store/toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const AUTO_OPTIONS = [
  { value: "none", label: "Manual (reviewer enters)" },
  { value: "attendance_punctuality", label: "Auto · Attendance & Punctuality" },
  { value: "attendance", label: "Auto · Attendance" },
  { value: "punctuality", label: "Auto · Punctuality" },
  { value: "student_results", label: "Auto · Student Results" },
];

const AUTO_LABEL = {
  attendance_punctuality: "Attendance & Punctuality",
  attendance: "Attendance",
  punctuality: "Punctuality",
  student_results: "Student Results",
};

function scoreColor(v) {
  if (v >= 85) return "success";
  if (v >= 70) return "secondary";
  return "destructive";
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default function StaffPerformancePage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [period, setPeriod] = useState(currentPeriod());
  const { data, isLoading } = usePerformanceCriteria();
  const { data: monthly, isLoading: monthlyLoading } = usePerformanceMonthly(period);
  const create = useCreateCriteria();
  const update = useUpdateCriteria();
  const del = useDeleteCriteria();
  const saveReview = useSavePerformanceReview();

  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [newAuto, setNewAuto] = useState("none");

  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const [open, setOpen] = useState(false);

  const criteria = data?.data || [];
  const rows = monthly?.data?.rows || [];
  const totalWeight = criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(c.weight || 0), 0);

  async function add(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ name: newName.trim(), weight: Number(newWeight) || 0, auto_source: newAuto === "none" ? null : newAuto });
      setNewName(""); setNewWeight(""); setNewAuto("none");
      toast(t("Saved successfully"), "success");
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  async function saveCriteria(c, patch) {
    try { await update.mutateAsync({ id: c.id, ...patch }); toast(t("Saved successfully"), "success"); }
    catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  function openReview(row) {
    setEditRow(row);
    const f = {};
    for (const it of row.items) f[it.criteria_id] = { value: String(it.value ?? ""), comment: it.comment || "" };
    setForm(f);
    setOpen(true);
  }

  async function submitReview() {
    if (!editRow) return;
    const items = editRow.items
      .map((it) => {
        const raw = form[it.criteria_id]?.value ?? "";
        const val = raw === "" ? null : Number(raw);
        const comment = form[it.criteria_id]?.comment || "";
        const changedValue = val === null ? it.is_overridden : val !== it.value;
        const changedComment = (comment || "") !== (it.comment || "");
        return changedValue || changedComment ? { criteria_id: it.criteria_id, value: val, comment: comment || null } : null;
      })
      .filter(Boolean);
    if (!items.length) { setOpen(false); return; }
    try {
      await saveReview.mutateAsync({ staffId: editRow.staff.id, period, items });
      toast(t("Saved successfully"), "success");
      setOpen(false);
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  async function resetReview() {
    if (!editRow) return;
    const items = editRow.items.filter((it) => it.is_overridden).map((it) => ({ criteria_id: it.criteria_id, value: null }));
    if (!items.length) { setOpen(false); return; }
    try {
      await saveReview.mutateAsync({ staffId: editRow.staff.id, period, items });
      toast(t("Reset to automatic"), "success");
      setOpen(false);
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Staff Performance")}</h1>
        <p className="text-muted-foreground">{t("Monthly ratings: attendance, punctuality and student results are computed automatically; reviewers adjust the rest")}</p>
      </div>

      {/* Monthly ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("Monthly Ratings")}</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t("Month")}</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">{t("No staff found")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border max-h-[32rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Staff")}</TableHead>
                    <TableHead>{t("Role")}</TableHead>
                    <TableHead className="text-right">{t("Present")}</TableHead>
                    <TableHead className="text-right">{t("Late")}</TableHead>
                    <TableHead className="text-right">{t("Absent")}</TableHead>
                    <TableHead className="text-right">{t("Results")}</TableHead>
                    <TableHead className="text-right">{t("Score")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.staff.id}>
                      <TableCell className="font-medium">{r.staff.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t.roles?.[r.staff.role] || r.staff.role}</TableCell>
                      <TableCell className="text-right">{r.metrics.present}</TableCell>
                      <TableCell className={"text-right " + (r.metrics.late > 0 ? "text-amber-600 font-medium" : "text-muted-foreground")}>{r.metrics.late}</TableCell>
                      <TableCell className={"text-right " + (r.metrics.absent > 0 ? "text-red-600 font-medium" : "text-muted-foreground")}>{r.metrics.absent}</TableCell>
                      <TableCell className="text-right">{r.metrics.result_pct != null ? `${r.metrics.result_pct}%` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={scoreColor(r.score)}>{r.score}%</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "reviewed"
                          ? <Badge variant="outline">{t("Reviewed")}</Badge>
                          : <Badge variant="secondary">{t("Auto")}</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openReview(r)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />{t("Review")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            {t("Scores are recomputed every month. Unreviewed criteria default to full marks.")}
          </p>
        </CardContent>
      </Card>

      {/* Criteria & weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("Criteria & Weights")}</span>
            <Badge variant={totalWeight === 100 ? "success" : "secondary"}>{t("Total")}: {totalWeight}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Criterion")}</TableHead>
                  <TableHead className="w-40">{t("Weight (%)")}</TableHead>
                  <TableHead className="w-64">{t("Source")}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.is_active === false && <Badge variant="secondary" className="ml-2">{t("Inactive")}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min="0" max="100" className="w-24"
                        defaultValue={c.weight}
                        onBlur={(e) => { const w = Number(e.target.value); if (w !== Number(c.weight)) saveCriteria(c, { weight: w }); }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={c.auto_source || "none"}
                        onValueChange={(v) => saveCriteria(c, { auto_source: v === "none" ? null : v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AUTO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {criteria.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t("No criteria yet")}</td></tr>}
              </TableBody>
            </Table>
          </div>

          <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-2 flex-1 min-w-56"><Label>{t("New criterion")}</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("e.g. Parent Communication")} /></div>
            <div className="space-y-2 w-32"><Label>{t("Weight (%)")}</Label><Input type="number" min="0" max="100" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} /></div>
            <div className="space-y-2 w-64">
              <Label>{t("Source")}</Label>
              <Select value={newAuto} onValueChange={setNewAuto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4 mr-1" />{t("Add")}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editRow?.staff?.name} · {period}
            </DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">{t("Present")}</p><p className="font-semibold">{editRow.metrics.present}</p></div>
                <div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">{t("Late")}</p><p className="font-semibold text-amber-600">{editRow.metrics.late}</p></div>
                <div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">{t("Absent")}</p><p className="font-semibold text-red-600">{editRow.metrics.absent}</p></div>
                <div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">{t("Results")}</p><p className="font-semibold">{editRow.metrics.result_pct != null ? `${editRow.metrics.result_pct}%` : "—"}</p></div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Criterion")}</TableHead>
                      <TableHead className="w-24">{t("Weight")}</TableHead>
                      <TableHead className="w-32">{t("Value")}</TableHead>
                      <TableHead className="w-64">{t("Comment")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRow.items.map((it) => (
                      <TableRow key={it.criteria_id}>
                        <TableCell>
                          <div className="font-medium">{it.name}</div>
                          {it.auto_source && (
                            <div className="text-xs text-muted-foreground">
                              {t("Auto")}: {t(AUTO_LABEL[it.auto_source])} · {it.computed_value != null ? `${it.computed_value}%` : t("no data")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{it.weight}%</TableCell>
                        <TableCell>
                          <Input
                            type="number" min="0" max="100"
                            value={form[it.criteria_id]?.value ?? ""}
                            onChange={(e) => setForm({ ...form, [it.criteria_id]: { ...(form[it.criteria_id] || {}), value: e.target.value } })}
                          />
                          {it.is_overridden && <p className="text-[11px] text-amber-600 mt-1">{t("overridden")}</p>}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={form[it.criteria_id]?.comment ?? ""}
                            onChange={(e) => setForm({ ...form, [it.criteria_id]: { ...(form[it.criteria_id] || {}), comment: e.target.value } })}
                            placeholder={t("Optional note")}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={resetReview}>{t("Reset to automatic")}</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
                  <Button onClick={submitReview} disabled={saveReview.isPending}>{t("Save")}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
