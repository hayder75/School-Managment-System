import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useI18n } from "../i18n/I18nContext";
import { ChevronLeft, ChevronRight, Save, Settings, Users, UserCheck, UserX, Clock, CalendarOff, Siren, Wallet, BarChart3 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", cls: "text-emerald-700 border-emerald-300 bg-emerald-50" },
  { value: "late", label: "Late", cls: "text-amber-700 border-amber-300 bg-amber-50" },
  { value: "absent", label: "Absent", cls: "text-rose-700 border-rose-300 bg-rose-50" },
  { value: "leave", label: "Leave", cls: "text-blue-700 border-blue-300 bg-blue-50" },
  { value: "emergency", label: "Emergency", cls: "text-purple-700 border-purple-300 bg-purple-50" },
  { value: "half_day", label: "Half Day", cls: "text-sky-700 border-sky-300 bg-sky-50" },
];

const ROLE_OPTIONS = ["teacher", "hr", "admin", "finance", "cashier", "accountant", "support", "general_services", "security_head", "shift_coordinator", "principal", "vice_principal", "quality_director", "general_manager"];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function toISO(d) {
  return d.toISOString().split("T")[0];
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

function statusMeta(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || { label: "—", cls: "text-muted-foreground border-neutral-300 bg-white" };
}

function StatCard({ title, value, sub, icon: Icon, tone = "primary" }) {
  const tones = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-100",
    rose: "text-rose-600 bg-rose-100",
    amber: "text-amber-600 bg-amber-100",
    blue: "text-blue-600 bg-blue-100",
    purple: "text-purple-600 bg-purple-100",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          {Icon && (
            <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCell({ value, onChange }) {
  const meta = statusMeta(value);
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full min-w-[92px] rounded-md border px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary ${meta.cls}`}
    >
      <option value="">—</option>
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

export default function TeacherAttendancePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const today = toISO(new Date());
  const [weekStart, setWeekStart] = useState(toISO(startOfWeek(today)));
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [tab, setTab] = useState("week");
  const [statsFrom, setStatsFrom] = useState(`${today.slice(0, 7)}-01`);
  const [statsTo, setStatsTo] = useState(today);
  const [stats, setStats] = useState(null);

  const [settings, setSettings] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dates = grid?.dates || [];

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/hr-enhancements/staff-attendance/week", {
        params: { week_start: weekStart, role: role || undefined, search: search || undefined },
      });
      setGrid(res.data);
      setEdits({});
      setSaved(false);
    } catch {
      setGrid(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart, role, search]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  useEffect(() => {
    api.get("/hr-enhancements/staff-attendance/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/hr-enhancements/staff-attendance/stats", {
        params: { from: statsFrom, to: statsTo, role: role || undefined, search: search || undefined },
      });
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, [statsFrom, statsTo, role, search]);

  useEffect(() => {
    if (tab === "stats") fetchStats();
  }, [tab, fetchStats]);

  function cellStatus(row, day) {
    const key = `${row.staff_id}|${day.date}`;
    if (edits[key] !== undefined) return edits[key];
    return day.status || "";
  }

  function handleCell(row, day, status) {
    setEdits((prev) => ({ ...prev, [`${row.staff_id}|${day.date}`]: status }));
    setSaved(false);
  }

  async function handleSave() {
    const entries = Object.entries(edits).map(([key, status]) => {
      const [staffId, date] = key.split("|");
      return { staffId, date, status };
    });
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await api.post("/hr-enhancements/staff-attendance/bulk", { entries });
      setSaved(true);
      await fetchGrid();
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(next) {
    const res = await api.put("/hr-enhancements/staff-attendance/settings", next);
    setSettings(res.data);
  }

  const editCount = Object.keys(edits).length;
  const totals = grid?.totals || {};
  const marked = (totals.present || 0) + (totals.absent || 0) + (totals.late || 0) + (totals.leave || 0) + (totals.emergency || 0) + (totals.half_day || 0);
  const presentLike = (totals.present || 0) + (totals.late || 0) + (totals.leave || 0) + (totals.emergency || 0);
  const presentRate = marked > 0 ? Math.round((presentLike / marked) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" /> {t("Teacher & Staff Attendance")}
          </h1>
          <p className="text-muted-foreground">{t("Mark weekly attendance for teachers and staff. Unreasoned absences feed payroll deductions.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen((v) => !v)} className="gap-2">
            <Settings className="h-4 w-4" /> {t("Deduction Settings")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/payroll")} className="gap-2">
            <Wallet className="h-4 w-4" /> {t("Payroll")}
          </Button>
          <Button onClick={handleSave} disabled={saving || editCount === 0} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? t("Saving...") : saved ? t("Saved") : `${t("Save")}${editCount ? ` (${editCount})` : ""}`}
          </Button>
        </div>
      </div>

      {settingsOpen && settings && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Attendance Deduction Settings")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={!!settings.deduction_enabled}
                  onChange={(e) => saveSettings({ ...settings, deduction_enabled: e.target.checked })}
                />
                {t("Enable absence deductions in payroll")}
              </label>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("Working days per month")}</label>
                <Input
                  type="number"
                  className="w-32"
                  defaultValue={settings.working_days}
                  onBlur={(e) => saveSettings({ ...settings, working_days: parseInt(e.target.value, 10) || 30 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("Birr deducted per day")}</label>
                <Input
                  type="number"
                  className="w-36"
                  defaultValue={settings.fixed_daily_rate || ""}
                  placeholder="0"
                  onBlur={(e) => saveSettings({ ...settings, fixed_daily_rate: e.target.value === "" ? null : parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">{t("% deducted per day")}</label>
                <Input
                  type="number"
                  className="w-32"
                  defaultValue={settings.deduction_percent || ""}
                  placeholder="0"
                  onBlur={(e) => saveSettings({ ...settings, deduction_percent: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                {t("Daily deduction = fixed birr + percentage of basic pay (you can set either or both). Only unreasoned absences are deducted — leave and emergency are paid; half day counts as 0.5.")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(toISO(addDays(new Date(`${weekStart}T00:00:00Z`), -7)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold min-w-[210px] text-center">
            {t("Week of")} {weekStart} → {dates[dates.length - 1] || ""}
          </div>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(toISO(addDays(new Date(`${weekStart}T00:00:00Z`), 7)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(toISO(startOfWeek(today)))}>{t("This week")}</Button>
        <Select value={role || "__all__"} onValueChange={(v) => setRole(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("All roles")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("All roles")}</SelectItem>
            {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{t(r)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-56" placeholder={t("Search name or email")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button type="button" onClick={() => setTab("week")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === "week" ? "bg-neutral-900 text-white" : "text-muted-foreground"}`}>{t("Weekly Grid")}</button>
          <button type="button" onClick={() => setTab("stats")} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === "stats" ? "bg-neutral-900 text-white" : "text-muted-foreground"}`}>{t("Statistics")}</button>
        </div>
      </div>

      {tab === "week" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard title={t("Staff")} value={grid?.rows?.length || 0} icon={Users} tone="primary" />
            <StatCard title={t("Present")} value={totals.present || 0} icon={UserCheck} tone="emerald" />
            <StatCard title={t("Absent")} value={totals.absent || 0} icon={UserX} tone="rose" />
            <StatCard title={t("Late")} value={totals.late || 0} icon={Clock} tone="amber" />
            <StatCard title={t("Leave")} value={totals.leave || 0} icon={CalendarOff} tone="blue" />
            <StatCard title={t("Unpaid days")} value={totals.unpaid_days || 0} sub={`${presentRate}% ${t("present")}`} icon={Siren} tone="purple" />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <p className="text-muted-foreground p-6">{t("Loading staff...")}</p>
              ) : !grid || grid.rows.length === 0 ? (
                <p className="text-muted-foreground p-6">{t("No staff found")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-20 min-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">{t("Staff / Teacher")}</TableHead>
                      <TableHead>{t("Role")}</TableHead>
                      {dates.map((d, i) => (
                        <TableHead key={d} className="text-center min-w-[100px]">
                          <span className="block text-xs">{t(DAY_LABELS[i])}</span>
                          <span className="block text-[10px] font-normal text-muted-foreground">{d.slice(5)}</span>
                        </TableHead>
                      ))}
                      <TableHead className="text-right">{t("Present %")}</TableHead>
                      <TableHead className="text-right">{t("Unpaid")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grid.rows.map((row) => (
                      <TableRow key={row.staff_id}>
                        <TableCell className="sticky left-0 bg-card z-10 min-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                          <p className="font-medium text-sm">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{t(row.role)}</Badge></TableCell>
                        {row.days.map((day) => (
                          <TableCell key={day.date} className="p-1">
                            <StatusCell value={cellStatus(row, day)} onChange={(s) => handleCell(row, day, s)} />
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-sm font-medium">{row.stats.attendance_rate}%</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-rose-600">{row.stats.unpaid_days}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("From")}</label>
              <Input type="date" className="w-44" value={statsFrom} onChange={(e) => setStatsFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("To")}</label>
              <Input type="date" className="w-44" value={statsTo} onChange={(e) => setStatsTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={fetchStats} className="gap-2"><BarChart3 className="h-4 w-4" /> {t("Refresh")}</Button>
          </div>

          {!stats ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard title={t("Present")} value={stats.totals.present} icon={UserCheck} tone="emerald" />
                <StatCard title={t("Absent")} value={stats.totals.absent} icon={UserX} tone="rose" />
                <StatCard title={t("Late")} value={stats.totals.late} icon={Clock} tone="amber" />
                <StatCard title={t("Leave")} value={stats.totals.leave} icon={CalendarOff} tone="blue" />
                <StatCard title={t("Emergency")} value={stats.totals.emergency} icon={Siren} tone="purple" />
                <StatCard title={t("Unpaid days")} value={stats.totals.unpaid_days} icon={Wallet} tone="rose" />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Per-staff summary")} ({stats.from} → {stats.to})</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Staff")}</TableHead>
                        <TableHead>{t("Role")}</TableHead>
                        <TableHead className="text-right">{t("Present")}</TableHead>
                        <TableHead className="text-right">{t("Absent")}</TableHead>
                        <TableHead className="text-right">{t("Late")}</TableHead>
                        <TableHead className="text-right">{t("Leave")}</TableHead>
                        <TableHead className="text-right">{t("Emergency")}</TableHead>
                        <TableHead className="text-right">{t("Half Day")}</TableHead>
                        <TableHead className="text-right">{t("Present %")}</TableHead>
                        <TableHead className="text-right">{t("Unpaid days")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.staff.map((s) => (
                        <TableRow key={s.staff_id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell><Badge variant="secondary">{t(s.role)}</Badge></TableCell>
                          <TableCell className="text-right text-emerald-700">{s.present}</TableCell>
                          <TableCell className="text-right text-rose-600">{s.absent}</TableCell>
                          <TableCell className="text-right text-amber-600">{s.late}</TableCell>
                          <TableCell className="text-right text-blue-600">{s.leave}</TableCell>
                          <TableCell className="text-right text-purple-600">{s.emergency}</TableCell>
                          <TableCell className="text-right">{s.half_day}</TableCell>
                          <TableCell className="text-right font-medium">{s.attendance_rate}%</TableCell>
                          <TableCell className="text-right font-semibold text-rose-600">{s.unpaid_days}</TableCell>
                        </TableRow>
                      ))}
                      {stats.staff.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">{t("No staff found")}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
