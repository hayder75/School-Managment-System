import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Plus } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function LeaveManagementPage() {
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadLeaves(); }, []);
  async function loadLeaves() { const r = await api.get("/payroll/leaves"); setLeaves(r.data || []); }
  async function submitLeave() { await api.post("/payroll/leaves", form); setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" }); setShowForm(false); loadLeaves(); }
  async function approve(id) { await api.patch(`/payroll/leaves/${id}/approve`); loadLeaves(); }
  async function reject(id) { await api.patch(`/payroll/leaves/${id}/reject`, { reason: "Declined" }); loadLeaves(); }

  const badgeVariant = (s) => s === "approved" ? "success" : s === "rejected" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Leave Management")}</h1>
          <p className="text-muted-foreground text-sm">{t("Review and approve staff leave requests — or submit your own.")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("Approved leave marks the teacher unavailable on the timetable (red) so a substitute can be assigned.")}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> {t("Request Leave")}</Button>
      </div>
      {showForm && <Card><CardHeader><CardTitle>{t("New Leave Request")}</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end flex-wrap">
          <div><Label>{t("Type")}</Label><select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.leave_type} onChange={e => setForm({...form,leave_type:e.target.value})}>
            {["annual","sick","maternity","paternity","emergency","unpaid"].map(lt => <option key={lt} value={lt} className="capitalize">{t(lt.charAt(0).toUpperCase() + lt.slice(1))}</option>)}
          </select></div>
          <div><Label>{t("Start")}</Label><EthiopianDateInput value={form.start_date} onChange={iso => setForm({...form,start_date:iso})} /></div>
          <div><Label>{t("End")}</Label><EthiopianDateInput value={form.end_date} onChange={iso => setForm({...form,end_date:iso})} /></div>
          <div><Label>{t("Reason")}</Label><Input value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} /></div>
          <Button onClick={submitLeave}>{t("Submit")}</Button>
        </div></CardContent>
      </Card>}
      <Card><CardHeader><CardTitle>{t("Leave Requests")}</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">
          {leaves.map(l => <div key={l.id} className="flex items-center justify-between border rounded-md p-3">
            <div className="text-sm"><span className="font-medium capitalize">{l.staff_name}</span> — <span className="capitalize">{l.leave_type}</span><br/>
              <span className="text-xs text-muted-foreground">{l.start_date?.slice(0,10)} → {l.end_date?.slice(0,10)}{l.reason ? ` · ${l.reason}` : ""}</span></div>
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant(l.status)} className="capitalize">{l.status}</Badge>
              {(user?.role === "admin" || user?.role === "owner" || user?.role === "hr") && l.status === "pending" && <>
                <Button size="sm" variant="outline" onClick={() => approve(l.id)}>{t("Approve")}</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => reject(l.id)}>{t("Reject")}</Button>
              </>}
            </div>
          </div>)}
          {leaves.length === 0 && <p className="text-muted-foreground">{t("No leave requests")}</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}
