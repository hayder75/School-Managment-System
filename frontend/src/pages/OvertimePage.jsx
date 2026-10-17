import { fullName } from "../lib/fullName";
import { useMemo, useState } from "react";
import {
  useOvertime, useOvertimeSummary, useOvertimeSettings,
  useCreateOvertime, useUpdateOvertime, useApproveOvertime, useDeleteOvertime,
  useUpdateOvertimeSettings, useStaffList,
} from "../hooks/useHr";
import { useToast } from "../store/toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, Pencil, Settings, CheckCircle2, Loader2 } from "lucide-react";

const TYPE_LABEL = {
  day: "Day (working hours)",
  night: "Night",
  rest_day: "Rest day",
  holiday: "Public holiday",
};

const STATUS_COLOR = { pending: "secondary", approved: "success" };

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const fmt = (v) => (v == null || v === "" ? "—" : v);
const money = (v) => (v == null ? "—" : Number(v).toLocaleString());

export default function OvertimePage() {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data, isLoading } = useOvertime({ month, staff_id: staffFilter === "all" ? undefined : staffFilter, status: statusFilter === "all" ? undefined : statusFilter });
  const { data: summary } = useOvertimeSummary(month);
  const { data: settingsData } = useOvertimeSettings();
  const { data: staffData } = useStaffList();
  const create = useCreateOvertime();
  const update = useUpdateOvertime();
  const approve = useApproveOvertime();
  const del = useDeleteOvertime();
  const saveSettings = useUpdateOvertimeSettings();

  const rows = data?.data || [];
  const summaryData = summary?.data || { by_type: [], by_staff: [], pending: {}, approved: {} };
  const settings = settingsData?.data || {};
  const staff = (staffData?.data?.staff || []).filter((s) => s.status === "active");

  const settingsFormInit = {
    working_days: settings.working_days ?? 26,
    hours_per_day: settings.hours_per_day ?? 8,
    day_multiplier: settings.day_multiplier ?? 1.5,
    night_multiplier: settings.night_multiplier ?? 1.75,
    rest_day_multiplier: settings.rest_day_multiplier ?? 2,
    holiday_multiplier: settings.holiday_multiplier ?? 2.5,
    day_start: settings.day_start || "06:00",
    day_end: settings.day_end || "22:00",
    holidays: (settings.holidays || []).join("\n"),
  };

  const totalHours = summaryData.by_type.reduce((s, r) => s + Number(r.hours || 0), 0);
  const totalAmount = summaryData.by_type.reduce((s, r) => s + Number(r.amount || 0), 0);

  async function handleApprove(id) {
    try { await approve.mutateAsync(id); toast("Overtime approved", "success"); }
    catch (err) { toast(err?.error?.message || err?.message || "Failed to approve", "error"); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this overtime entry?")) return;
    try { await del.mutateAsync(id); toast("Deleted", "success"); }
    catch (err) { toast(err?.error?.message || err?.message || "Failed to delete", "error"); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Overtime</h1>
          <p className="text-sm text-muted-foreground">Record staff overtime, compute pay, and push it into payroll.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
          <Button onClick={() => { setEditRow(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Overtime
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-medium">Pending entries</p>
          <p className="text-2xl font-semibold mt-1">{summaryData.pending?.entries ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">ETB {money(summaryData.pending?.amount)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-medium">Approved</p>
          <p className="text-2xl font-semibold mt-1">{summaryData.approved?.entries ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">ETB {money(summaryData.approved?.amount)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-medium">Total hours</p>
          <p className="text-2xl font-semibold mt-1">{Number(totalHours).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">across {summaryData.by_type.length} type(s)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground font-medium">Total value</p>
          <p className="text-2xl font-semibold mt-1">ETB {money(totalAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">feeds into payroll as overtime</p>
        </CardContent></Card>
      </div>

      {/* By-type breakdown */}
      {summaryData.by_type.length > 0 && (
        <Card><CardHeader><CardTitle>By type</CardTitle></CardHeader><CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {summaryData.by_type.map((r) => (
              <div key={r.type} className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">{TYPE_LABEL[r.type] || r.type}</p>
                <p className="text-lg font-semibold mt-1">{r.hours} h · ETB {money(r.amount)}</p>
                <p className="text-xs text-muted-foreground">{r.entries} entr{r.entries === 1 ? "y" : "ies"}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>{fullName(s)} · {s.role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Hourly</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-2" />Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No overtime recorded for this period.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.staff_name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}{r.job_title ? ` · ${r.job_title}` : ""}</div>
                </TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{fmt(r.hours)}</TableCell>
                <TableCell>{TYPE_LABEL[r.overtime_type] || r.overtime_type}</TableCell>
                <TableCell>{r.multiplier}×</TableCell>
                <TableCell>{money(r.hourly_rate)}</TableCell>
                <TableCell className="font-medium">{money(r.amount)}</TableCell>
                <TableCell><Badge variant={STATUS_COLOR[r.status]}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {r.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id)} title="Approve">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setEditRow(r); setOpen(true); }} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {open && (
        <OvertimeForm
          staff={staff}
          settings={settings}
          editRow={editRow}
          onClose={() => setOpen(false)}
          onSave={async (payload) => {
            try {
              if (editRow) await update.mutateAsync({ id: editRow.id, data: payload });
              else await create.mutateAsync(payload);
              toast("Saved", "success");
              setOpen(false);
            } catch (err) { toast(err?.error?.message || err?.message || "Failed to save", "error"); }
          }}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          initial={settingsFormInit}
          onClose={() => setSettingsOpen(false)}
          onSave={async (payload) => {
            try {
              await saveSettings.mutateAsync(payload);
              toast("Overtime settings saved", "success");
              setSettingsOpen(false);
            } catch (err) { toast(err?.error?.message || err?.message || "Failed to save", "error"); }
          }}
        />
      )}
    </div>
  );
}

function OvertimeForm({ staff, settings, editRow, onClose, onSave }) {
  const [staffId, setStaffId] = useState(editRow?.staff_id || "");
  const [date, setDate] = useState(editRow?.date || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [hours, setHours] = useState(editRow?.hours ?? "");
  const [type, setType] = useState(editRow?.overtime_type || "auto");
  const [status, setStatus] = useState(editRow?.status || "pending");
  const [notes, setNotes] = useState(editRow?.notes || "");
  const [saving, setSaving] = useState(false);

  const chosen = staff.find((s) => s.id === staffId);
  const basic = Number(chosen?.basic_salary) || 0;
  const workingDays = Number(settings.working_days) || 26;
  const hoursPerDay = Number(settings.hours_per_day) || 8;
  const hourly = basic > 0 ? basic / workingDays / hoursPerDay : 0;
  const multiplier = type === "auto" ? settings.day_multiplier ?? 1.5
    : type === "night" ? (settings.night_multiplier ?? 1.75)
    : type === "rest_day" ? (settings.rest_day_multiplier ?? 2)
    : type === "holiday" ? (settings.holiday_multiplier ?? 2.5)
    : settings.day_multiplier ?? 1.5;
  const amount = (Number(hours) || 0) * hourly * multiplier;

  async function submit(e) {
    e.preventDefault();
    if (!staffId || !date) return;
    setSaving(true);
    try {
      await onSave({
        staffId, date,
        hours: Number(hours) || 0,
        overtimeType: type === "auto" ? undefined : type,
        startTime: startTime || undefined,
        status,
        notes: notes || undefined,
      });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editRow ? "Edit overtime" : "Add overtime"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{fullName(s)} · {s.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 3" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Used for auto type detection</p>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (from date/time)</SelectItem>
                  <SelectItem value="day">Day ({settings.day_start || "06:00"}–{settings.day_end || "22:00"})</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="rest_day">Rest day</SelectItem>
                  <SelectItem value="holiday">Public holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Basic salary</span><span>ETB {money(basic)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Hourly rate</span><span>ETB {hourly.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Multiplier</span><span>{multiplier}×</span></div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Amount</span><span>ETB {amount.toFixed(2)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !staffId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {editRow ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const holidays = String(form.holidays || "").split(/[\n,]/).map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
      await onSave({ ...form, holidays });
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Overtime settings</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Working days / month</Label>
              <Input type="number" min="1" value={form.working_days} onChange={(e) => set("working_days", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours / day</Label>
              <Input type="number" min="1" step="0.5" value={form.hours_per_day} onChange={(e) => set("hours_per_day", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day window (start)</Label>
              <Input type="time" value={form.day_start} onChange={(e) => set("day_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Day window (end)</Label>
              <Input type="time" value={form.day_end} onChange={(e) => set("day_end", e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Multipliers</p>
            {[
              ["day_multiplier", "Day (within window)"],
              ["night_multiplier", "Night (outside window)"],
              ["rest_day_multiplier", "Rest day"],
              ["holiday_multiplier", "Public holiday"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="font-normal">{label}</Label>
                <Input type="number" min="1" step="0.05" className="w-24" value={form[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Public holidays (YYYY-MM-DD, one per line)</Label>
            <textarea
              value={form.holidays}
              onChange={(e) => set("holidays", e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder={"2026-01-07\n2026-04-18"}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}