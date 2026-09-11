import { useState, useEffect } from "react";
import { useI18n } from "../i18n/I18nContext";
import api from "../lib/api";
import { useQuery } from "@tanstack/react-query";
import { useGuardShiftsList, useCreateGuardShift } from "../hooks/useShiftHub";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  ShieldCheck, UserX, CalendarClock, Plus, Trash2, Users, Sun, Moon, X,
} from "lucide-react";

const POSTS = ["Main Gate", "KG Gate", "Admin Block", "Playground", "Dormitory"];

export default function ShiftDutyHubPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("today");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rosterModal, setRosterModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.shift.title}</h1>
          <p className="text-muted-foreground">{t.shift.subtitle}</p>
        </div>
        <EthiopianDateInput className="w-56" value={date} onChange={setDate} />
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {[["today", t.shift.todayBoard], ["subs", t.shift.substitutions], ["guards", t.shift.guardRoster]].map(([k, label]) => (
          <Button key={k} variant={tab === k ? "default" : "ghost"} onClick={() => setTab(k)}>{label}</Button>
        ))}
      </div>

      {tab === "today" && <TodayBoard date={date} />}
      {tab === "subs" && <SubstitutionBoard />}
      {tab === "guards" && (
        <>
          <Button onClick={() => setRosterModal(true)}><Plus className="h-4 w-4 mr-2" />{t.shift.addGuardShift}</Button>
          <GuardRoster date={date} onAdd={() => setRosterModal(true)} />
        </>
      )}
      <NewGuardShiftDialog open={rosterModal} onClose={() => setRosterModal(false)} defaultDate={date} />
    </div>
  );
}

function SubstitutionBoard() {
  const { t } = useI18n();
  const [subs, setSubs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    originalTeacherId: "", substituteTeacherId: "",
    date: new Date().toISOString().slice(0, 10),
    periodName: "Period 1 (08:30 - 09:30)",
    reason: "Sick Leave / Absence Coverage", notes: "",
  });

  const loadSubs = () => fetch("/api/shifts/substitutions").then((r) => r.json()).then((d) => d.success && setSubs(d.data));
  useEffect(() => {
    loadSubs();
    fetch("/api/shifts/teachers").then((r) => r.json()).then((d) => d.success && setTeachers(d.data));
  }, []);

  async function assign(e) {
    e.preventDefault();
    await fetch("/api/shifts/substitutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    loadSubs();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t.shift.newSubstitution}</Button>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm min-w-[600px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.shift.absentTeacher}</th>
            <th className="p-3 font-medium">→</th>
            <th className="p-3 font-medium">{t.shift.substitute}</th>
            <th className="p-3 font-medium">{t.shift.dateCol}</th>
            <th className="p-3 font-medium">{t.shift.periodCol}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
          </tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{s.original_teacher_name}</td>
                <td className="p-3 text-muted-foreground">→</td>
                <td className="p-3">{s.substitute_teacher_name}</td>
                <td className="p-3">{s.date?.slice(0, 10)}</td>
                <td className="p-3 text-xs">{s.period_name}</td>
                <td className="p-3"><Badge>{s.status}</Badge></td>
              </tr>
            ))}
            {!subs.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent></Card>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">{t.shift.newSubstitution}</h2>
            <form onSubmit={assign} className="space-y-3">
              <div>
                <Label>{t.shift.absentTeacher}</Label>
                <select required value={form.originalTeacherId} onChange={(e) => setForm({ ...form, originalTeacherId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                  <option value="">—</option>
                  {teachers.map((x) => <option key={x.id} value={x.id}>{x.first_name} {x.last_name}</option>)}
                </select>
              </div>
              <div>
                <Label>{t.shift.substitute}</Label>
                <select required value={form.substituteTeacherId} onChange={(e) => setForm({ ...form, substituteTeacherId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
                  <option value="">—</option>
                  {teachers.filter((x) => x.id !== form.originalTeacherId).map((x) => (
                    <option key={x.id} value={x.id}>{x.first_name} {x.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{t.shift.dateCol}</Label>
                  <EthiopianDateInput value={form.date} onChange={(iso) => setForm({ ...form, date: iso })} /></div>
                <div><Label>{t.shift.periodCol}</Label>
                  <Input value={form.periodName} onChange={(e) => setForm({ ...form, periodName: e.target.value })} /></div>
              </div>
              <div><Label>{t.security.reason}</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              <Button type="submit" className="w-full">{t.common.save}</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TodayBoard({ date }) {
  const { t } = useI18n();
  const { data: rosterData, isLoading } = useQuery({
    queryKey: ["live-roster", date],
    queryFn: () => api.get("/shifts/live-roster", { params: { date } }),
  });

  const roster = rosterData?.data || {};
  const present = roster.present || roster.staff || [];
  const absent = roster.absent || [];
  const onLeave = roster.on_leave || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{present.length}</p><p className="text-xs text-muted-foreground">{t.shift.onDuty}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><UserX className="h-8 w-8 text-red-500" /><div><p className="text-2xl font-bold">{absent.length}</p><p className="text-xs text-muted-foreground">{t.shift.absentToday}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CalendarClock className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{onLeave.length}</p><p className="text-xs text-muted-foreground">{t.shift.onLeaveToday}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">{(present.length / Math.max(present.length + absent.length + onLeave.length, 1) * 100).toFixed(0)}%</p><p className="text-xs text-muted-foreground">{t.shift.presenceRate}</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-red-600">{t.shift.absentList}</CardTitle></CardHeader>
          <CardContent>
            {(absent || []).length ? absent.map((s) => (
              <div key={s.id || s.email} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="text-sm font-medium">{s.first_name} {s.last_name}</span>
                <span className="text-xs text-muted-foreground">{s.job_title || s.role}</span>
              </div>
            )) : <p className="py-4 text-sm text-muted-foreground">{t.shift.everyoneReported}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-blue-600">{t.shift.leaveList}</CardTitle></CardHeader>
          <CardContent>
            {(onLeave || []).length ? onLeave.map((l, i) => (
              <div key={l.id || i} className="border-b py-2 last:border-0 text-sm">
                <span className="font-medium">{l.staff_name || l.name || `${l.first_name || ""} ${l.last_name || ""}`}</span>
                <span className="ml-2 text-xs text-muted-foreground">{l.leave_type} · {l.start_date} → {l.end_date}</span>
              </div>
            )) : <p className="py-4 text-sm text-muted-foreground">{t.shift.noLeaves}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GuardRoster({ date }) {
  const { t } = useI18n();
  const { data, isLoading } = useGuardShiftsList({ date });
  const rows = data?.data || [];

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{t.shift.guardRosterTitle}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">{t.shift.guard}</th>
              <th className="p-3 font-medium">{t.shift.dateCol}</th>
              <th className="p-3 font-medium">{t.shift.timeCol}</th>
              <th className="p-3 font-medium">{t.shift.post}</th>
              <th className="p-3 font-medium">{t.qa.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{g.guard_name || `${g.first_name || ""} ${g.last_name || ""}`}</td>
                <td className="p-3">{g.shift_date?.slice(0, 10)}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <Sun size={13} className="text-amber-500" />{g.start_time || "06:00"}
                    <span className="text-neutral-400">→</span>
                    {(g.end_time || "18:00") && g.start_time && g.end_time && g.end_time < g.start_time
                      ? <><Moon size={13} className="text-indigo-500" />{g.end_time}</>
                      : <>{g.end_time}</>}
                  </span>
                </td>
                <td className="p-3">{g.post_location}</td>
                <td className="p-3"><Badge>{g.status}</Badge></td>
              </tr>
            ))}
            {!isLoading && !rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent>
    </Card>
  );
}

function Badge({ children }) {
  return <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">{children}</span>;
}

function NewGuardShiftDialog({ open, onClose, defaultDate }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ guard_user_id: "", shift_date: defaultDate, start_time: "06:00", end_time: "18:00", post_location: POSTS[0], notes: "" });
  const { data: teachersData } = useQuery({
    queryKey: ["guard-candidates"],
    queryFn: () => api.get("/shifts/teachers"),
    enabled: open,
  });
  const createMutation = useCreateGuardShift();

  async function submit(e) {
    e.preventDefault();
    await createMutation.mutateAsync({
      guardUserId: form.guard_user_id,
      shiftDate: form.shift_date,
      startTime: form.start_time,
      endTime: form.end_time,
      postLocation: form.post_location,
      notes: form.notes,
    });
    onClose();
  }

  const candidates = teachersData?.data || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.shift.addGuardShift}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.shift.guard}</Label>
            <Select value={form.guard_user_id} onValueChange={(v) => setForm({ ...form, guard_user_id: v })}>
              <SelectTrigger><SelectValue placeholder={t.shift.selectGuard} /></SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.shift.dateCol}</Label>
              <EthiopianDateInput value={form.shift_date} onChange={(iso) => setForm({ ...form, shift_date: iso })} />
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.shift.startTime}</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t.shift.endTime}</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
          </div>
          </div>
          <div className="space-y-2">
            <Label>{t.shift.post}</Label>
            <Select value={form.post_location} onValueChange={(v) => setForm({ ...form, post_location: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{POSTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{t.common.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
