import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { useI18n } from "../../i18n/I18nContext";
import { useAuthStore } from "../../store/auth";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Printer, Save, Loader2, Clock,
} from "lucide-react";

const DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
];

export const LEVEL_LABELS = { nursery: "Nursery", lkg: "LKG", ukg: "UKG" };

export function eth(hhmm) {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).split(":").map(Number);
  let total = (h * 60 + m - 360 + 1440) % 1440;
  let eh = Math.floor(total / 60);
  const em = total % 60;
  if (eh === 0) eh = 12;
  else if (eh > 12) eh -= 12;
  return `${eh}:${String(em).padStart(2, "0")}`;
}

function addMinutes(hhmm, mins) {
  const [h, m] = String(hhmm || "08:00").split(":").map(Number);
  const total = (h * 60 + m + mins + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function blankRow(start) {
  return {
    start_time: start, end_time: addMinutes(start, 30),
    full_week: false, activity: "",
    monday: "", tuesday: "", wednesday: "", thursday: "", friday: "",
  };
}

export default function KgScheduleEditor({ level }) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const canManage = ["owner", "admin", "general_manager", "principal", "vice_principal", "quality_director", "hr"].includes(user?.role)
    || (user?.permissions || []).includes("timetable.manage");
  const readOnly = !canManage;
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (lv) => {
    setLoading(true); setError(""); setNotice("");
    try {
      const res = await api.get("/kg-schedule", { params: { level: lv } });
      const data = res.data || {};
      setSlots((data.slots || []).map((s) => ({
        start_time: String(s.start_time || "08:00").slice(0, 5),
        end_time: String(s.end_time || "08:30").slice(0, 5),
        full_week: !!s.full_week,
        activity: s.activity || "",
        monday: s.monday || "", tuesday: s.tuesday || "", wednesday: s.wednesday || "",
        thursday: s.thursday || "", friday: s.friday || "",
      })));
    } catch (e) {
      setError(e?.error?.message || e?.message || "Could not load the schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(level); }, [level, load]);

  function update(idx, patch) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function toggleFullWeek(idx, checked) {
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      if (checked) return { ...s, full_week: true, activity: s.activity || s.monday || "" };
      const text = s.activity || "";
      return { ...s, full_week: false, monday: text, tuesday: text, wednesday: text, thursday: text, friday: text };
    }));
  }

  function addRow() {
    setSlots((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, blankRow(last?.end_time || "08:00")];
    });
  }

  function removeRow(idx) { setSlots((prev) => prev.filter((_, i) => i !== idx)); }

  function move(idx, dir) {
    setSlots((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function save() {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = slots.map((s) => ({
        start_time: s.start_time, end_time: s.end_time,
        full_week: !!s.full_week, activity: s.activity,
        monday: s.monday, tuesday: s.tuesday, wednesday: s.wednesday,
        thursday: s.thursday, friday: s.friday,
      }));
      await api.put(`/kg-schedule?level=${level}`, { slots: payload });
      setNotice(t("Schedule saved."));
      await load(level);
    } catch (e) {
      setError(e?.error?.message || e?.message || "Could not save the schedule");
    } finally {
      setSaving(false);
    }
  }

  const levelLabel = LEVEL_LABELS[level] || level;

  return (
    <div className="space-y-3">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { padding: 0 !important; } .print-area { width: 100% !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <p className="text-sm text-muted-foreground">
          {t("Edit the times and activities. Tick \"Whole week\" to repeat one activity across Monday–Friday.")}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> {t("Print")}</Button>
          {!readOnly && (
            <Button className="gap-2" onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? t("Saving…") : t("Save")}
            </Button>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-md p-2.5">{error}</div>}
      {notice && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2.5">{notice}</div>}

      <Card className="print-area">
        <CardContent className="p-3 sm:p-4 overflow-x-auto">
          <div className="mb-3 text-center">
            <p className="text-lg font-bold">{levelLabel} — {t("Weekly Schedule")}</p>
            <p className="text-xs text-muted-foreground">{t("Times shown in Ethiopian clock under each English time.")}</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…")}</div>
          ) : (
            <table className="w-full border-collapse text-sm min-w-[820px]">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border p-2 text-left w-[150px]">{t("Time")}</th>
                  {DAYS.map((d) => <th key={d.key} className="border p-2 text-center">{t(d.label)}</th>)}
                  {!readOnly && <th className="border p-2 text-center w-[130px] no-print">{t("Options")}</th>}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="border p-1.5">
                      <div className="flex items-center gap-1">
                        <Input type="time" value={s.start_time} disabled={readOnly} onChange={(e) => update(idx, { start_time: e.target.value })} className="h-8 w-[92px] px-1 text-xs" />
                        <span className="text-muted-foreground">–</span>
                        <Input type="time" value={s.end_time} disabled={readOnly} onChange={(e) => update(idx, { end_time: e.target.value })} className="h-8 w-[92px] px-1 text-xs" />
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {eth(s.start_time)}–{eth(s.end_time)} {t("(ET)")}
                      </div>
                    </td>

                    {s.full_week ? (
                      <td className="border p-1.5" colSpan={5}>
                        <Input value={s.activity} disabled={readOnly} onChange={(e) => update(idx, { activity: e.target.value })}
                          placeholder={t("Same for the whole week (e.g. Rest / Play / Breakfast)")} className="h-8 text-xs text-center" />
                      </td>
                    ) : (
                      DAYS.map((d) => (
                        <td key={d.key} className="border p-1.5">
                          <Input value={s[d.key] || ""} disabled={readOnly} onChange={(e) => update(idx, { [d.key]: e.target.value })} className="h-8 text-xs text-center" />
                        </td>
                      ))
                    )}

                    {!readOnly && (
                    <td className="border p-1.5 no-print">
                      <div className="flex flex-col items-center gap-1">
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                          <input type="checkbox" checked={!!s.full_week} onChange={(e) => toggleFullWeek(idx, e.target.checked)} />
                          {t("Whole week")}
                        </label>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, -1)} title={t("Move up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, 1)} title={t("Move down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(idx)} title={t("Delete")}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
                        </div>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
                {!slots.length && (
                  <tr><td colSpan={readOnly ? 6 : 7} className="border p-6 text-center text-muted-foreground">{t("No time slots yet.")}</td></tr>
                )}
              </tbody>
            </table>
          )}

          {!readOnly && (
            <div className="mt-3 no-print">
              <Button variant="outline" className="gap-2" onClick={addRow}><Plus className="h-4 w-4" /> {t("Add time slot")}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}