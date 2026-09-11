import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import {
  useVisitors, useCreateVisitor, useCheckoutVisitor,
  useGatePasses, useVerifyGatePass, useIncidents, useCreateIncident,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { ShieldCheck, UserCheck, AlertTriangle, LogOut } from "lucide-react";

export default function SecurityHubPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("visitors");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.security.title}</h1>
        <p className="text-muted-foreground">{t.security.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {[["visitors", t.security.visitorLog], ["passes", t.security.gatePasses], ["incidents", t.security.incidents], ["report", t.qa.reportTab]].map(([k, label]) => (
          <Button key={k} variant={tab === k ? "default" : "ghost"} onClick={() => setTab(k)}>{label}</Button>
        ))}
      </div>

      {tab === "visitors" && <VisitorLog />}
      {tab === "passes" && <GatePasses />}
      {tab === "incidents" && <IncidentRegister />}
      {tab === "report" && <SecuritySummaryStrip />}
    </div>
  );
}

function SecuritySummaryStrip() {
  const { t } = useI18n();
  const { data: incData } = useIncidents({});
  const incidents = incData?.data || [];
  const open = incidents.filter((i) => i.status === "open").length;
  const critical = incidents.filter((i) => i.severity === "critical").length;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{incidents.length}</p><p className="text-xs text-muted-foreground">{t.security.reportTotalIncidents}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-amber-600">{open}</p><p className="text-xs text-muted-foreground">{t.security.reportOpenIncidents}</p></CardContent></Card>
      <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-red-600">{critical}</p><p className="text-xs text-muted-foreground">{t.security.sev_critical}</p></CardContent></Card>
    </div>
  );
}

function VisitorLog() {
  const { t } = useI18n();
  const { data } = useVisitors();
  const createV = useCreateVisitor();
  const checkout = useCheckoutVisitor();
  const rows = data?.data || [];

  return (
    <>
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button><UserCheck className="h-4 w-4 mr-2" />{t.security.logVisitor}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.security.logVisitor}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createV.mutate(Object.fromEntries(new FormData(e.target).entries()), () => document.querySelector("form")?.reset()); }} className="space-y-3">
              <div className="space-y-1"><Label>{t.security.visitorName}</Label><Input name="visitor_name" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t.security.phone}</Label><Input name="phone" /></div>
                <div className="space-y-1"><Label>{t.security.badge}</Label><Input name="badge_number" /></div>
              </div>
              <div className="space-y-1"><Label>{t.security.personVisited}</Label><Input name="person_visited" required /></div>
              <div className="space-y-1"><Label>{t.security.purpose}</Label><Input name="purpose" required /></div>
              <Button type="submit" className="w-full" disabled={createV.isPending}>{t.common.save}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.security.visitorName}</th>
            <th className="p-3 font-medium">{t.security.personVisited}</th>
            <th className="p-3 font-medium">{t.security.purpose}</th>
            <th className="p-3 font-medium">{t.security.badge}</th>
            <th className="p-3 font-medium">In / Out</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{v.visitor_name}<span className="block text-xs text-muted-foreground">{v.phone || v.national_id || ""}</span></td>
                <td className="p-3">{v.person_visited}</td>
                <td className="p-3 max-w-[180px] truncate text-xs text-muted-foreground">{v.purpose}</td>
                <td className="p-3">{v.badge_number || "—"}</td>
                <td className="p-3 text-xs">{v.time_in ? new Date(v.time_in).toLocaleTimeString() : "—"}<br />{v.time_out ? new Date(v.time_out).toLocaleTimeString() : <span className="text-green-600 font-medium">{t.security.onPremises}</span>}</td>
                <td className="p-3 text-right">
                  {!v.time_out && (
                    <Button size="sm" variant="outline" onClick={() => checkout.mutate(v.id)}>
                      <LogOut className="h-3 w-3 mr-1" />{t.security.checkout}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent></Card>
    </>
  );
}

function GatePasses() {
  const { t } = useI18n();
  const { data } = useGatePasses();
  const verify = useVerifyGatePass();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const rows = data?.data || [];

  async function doVerify(e) {
    e.preventDefault();
    try {
      const res = await verify.mutateAsync(code);
      setResult({ ok: true, name: `${res.student_first_name || ""} ${res.student_last_name || ""}` });
    } catch (err) {
      setResult({ ok: false, message: err?.error?.message || "Invalid pass code" });
    }
    setCode("");
  }

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader className="pb-2"><CardTitle className="text-base">{t.security.verifyPassTitle}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={doVerify} className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="GP-XXXXXX-XXXX" required />
            <Button type="submit" disabled={verify.isPending}><ShieldCheck className="h-4 w-4" /></Button>
          </form>
          {result && result.ok && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              ✓ {t.security.departureApproved}: <strong>{result.name}</strong>
            </div>
          )}
          {result && !result.ok && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{result.message}</div>
          )}
          <p className="text-xs text-muted-foreground">{t.security.verifyHint}</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2"><CardContent className="p-0">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.security.studentCol}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
            <th className="p-3 font-medium">{t.shift.dateCol}</th>
            <th className="p-3 font-medium">{t.security.reason}</th>
            <th className="p-3 font-medium">{t.security.passCode}</th>
          </tr></thead>
          <tbody>
            {rows.map((gp) => (
              <tr key={gp.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{gp.student_first_name} {gp.student_last_name}<span className="block text-xs text-muted-foreground">{gp.student_code || ""}</span></td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${gp.status === "issued" ? "bg-blue-100 text-blue-700" : gp.status === "verified_departed" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {t.security[gp.status] || gp.status}
                  </span>
                </td>
                <td className="p-3 text-xs">{gp.departure_date}<br />{gp.departure_time}</td>
                <td className="p-3 max-w-[160px] truncate text-xs text-muted-foreground">{gp.reason}</td>
                <td className="p-3 font-mono text-xs">{gp.pass_code}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent></Card>
    </div>
  );
}

function IncidentRegister() {
  const { t } = useI18n();
  const { data } = useIncidents();
  const createI = useCreateIncident();
  const rows = data?.data || [];
  const SEV_STYLES = { low: "bg-neutral-100 text-neutral-600", medium: "bg-blue-100 text-blue-700", high: "bg-amber-100 text-amber-700", critical: "bg-red-100 text-red-700" };

  return (
    <>
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" />{t.security.reportIncident}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.security.reportIncident}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createI.mutate(Object.fromEntries(new FormData(e.target).entries())); e.target.reset(); }} className="space-y-3">
              <div className="space-y-1"><Label>{t.qa.titleCol}</Label><Input name="title" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t.security.severity}</Label>
                  <Select name="severity" defaultValue="low">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["low", "medium", "high", "critical"].map((s) => <SelectItem key={s} value={s}>{t.security[`sev_${s}`]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>{t.security.location}</Label><Input name="location" /></div>
              </div>
              <div className="space-y-1"><Label>{t.security.descriptionCol}</Label><textarea name="description" rows={4} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="space-y-1"><Label>{t.security.actionTaken}</Label><Input name="action_taken" /></div>
              <Button type="submit" className="w-full" disabled={createI.isPending}>{t.common.save}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.qa.titleCol}</th>
            <th className="p-3 font-medium">{t.security.severity}</th>
            <th className="p-3 font-medium">{t.security.location}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
            <th className="p-3 font-medium">{t.shift.dateCol}</th>
          </tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{i.title}<span className="block text-xs text-muted-foreground max-w-[280px] truncate">{i.description}</span></td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${SEV_STYLES[i.severity]}`}>{t.security[`sev_${i.severity}`]}</span></td>
                <td className="p-3">{i.location || "—"}</td>
                <td className="p-3">{i.status}</td>
                <td className="p-3 text-xs"><EthiopianDate date={i.created_at} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent></Card>
    </>
  );
}
