import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import {
  useMaintenance, useCreateMaintenance, useUpdateMaintenance, useMaintenanceSummary,
  usePurchases, useCreatePurchase, useDecidePurchase,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Wrench, ShoppingCart } from "lucide-react";

const CATEGORIES = ["electrical", "plumbing", "furniture", "structural", "other"];
const STATUS_STYLES = { open: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-green-100 text-green-700", cancelled: "bg-neutral-100 text-neutral-500" };

export default function GeneralServicesPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("maintenance");
  const { data: sumData } = useMaintenanceSummary();
  const s = sumData?.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.services.title}</h1>
        <p className="text-muted-foreground">{t.services.subtitle}</p>
      </div>

      {/* Services report strip */}
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        {[[
          s.open ?? 0, t.services.open, "text-blue-600",
        ], [
          s.in_progress ?? 0, t.services.in_progress, "text-amber-600",
        ], [
          s.completed ?? 0, t.services.completed, "text-green-600",
        ], [
          Number(s.total_spent || 0).toLocaleString() + " ETB", t.services.reportTotalSpent, "text-neutral-900",
        ]].map(([v, label, color]) => (
          <Card key={label}><CardContent className="pt-6"><p className={`text-2xl font-bold ${color}`}>{v}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[["maintenance", t.services.maintenance], ["purchases", t.services.purchases]].map(([k, l]) => (
          <Button key={k} variant={tab === k ? "default" : "ghost"} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>
      {tab === "maintenance" ? <MaintenanceBoard /> : <PurchaseBoard />}
    </div>
  );
}

function MaintenanceBoard() {
  const { t } = useI18n();
  const { data } = useMaintenance();
  const createM = useCreateMaintenance();
  const updateM = useUpdateMaintenance();
  const rows = data?.data || [];

  return (
    <>
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button><Wrench className="h-4 w-4 mr-2" />{t.services.newTicket}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.services.newTicket}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); createM.mutate(Object.fromEntries(fd.entries())); e.target.closest("[role=dialog]").querySelector("button[type=button]")?.click(); }} className="space-y-3">
              <div className="space-y-1"><Label>{t.qa.titleCol}</Label><Input name="title" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t.security.location}</Label><Input name="location" required /></div>
                <div className="space-y-1"><Label>{t.services.category}</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t.services[`cat_${c}`]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>{t.security.descriptionCol}</Label><textarea name="description" rows={4} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="space-y-1"><Label>{t.services.estCost}</Label><Input name="estimated_cost" type="number" step="0.01" min="0" defaultValue="0" /></div>
              <Button type="submit" className="w-full" disabled={createM.isPending}>{t.common.save}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.qa.titleCol}</th>
            <th className="p-3 font-medium">{t.security.location}</th>
            <th className="p-3 font-medium">{t.services.category}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
            <th className="p-3 font-medium">{t.services.cost}</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{m.title}<span className="block text-xs text-muted-foreground max-w-[240px] truncate">{m.description}</span></td>
                <td className="p-3">{m.location}</td>
                <td className="p-3">{t.services[`cat_${m.category}`] || m.category}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[m.status]}`}>{t.services[m.status]}</span></td>
                <td className="p-3 text-xs">≈{m.estimated_cost || 0}<br />✓{m.actual_cost || 0}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {m.status === "open" && <Button size="sm" variant="outline" onClick={() => updateM.mutate({ id: m.id, status: "in_progress" })}>{t.services.startWork}</Button>}
                  {m.status === "in_progress" && (
                    <Button size="sm" disabled={updateM.isPending}
                      onClick={() => {
                        const cost = window.prompt(t.services.promptActualCost, m.estimated_cost || "0");
                        if (cost !== null) updateM.mutate({ id: m.id, status: "completed", actual_cost: Number(cost) });
                      }}>
                      {t.services.markDone}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}

function PurchaseBoard() {
  const { t } = useI18n();
  const { data } = usePurchases();
  const createP = useCreatePurchase();
  const decide = useDecidePurchase();
  const rows = data?.data || [];
  const P_STYLES = { pending: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };

  return (
    <>
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild><Button><ShoppingCart className="h-4 w-4 mr-2" />{t.services.newRequest}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.services.newRequest}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries()); fd.quantity = Number(fd.quantity); fd.estimated_cost = Number(fd.estimated_cost); createP.mutate(fd); e.target.reset(); }} className="space-y-3">
              <div className="space-y-1"><Label>{t.services.itemName}</Label><Input name="item_name" required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{t.services.quantity}</Label><Input name="quantity" type="number" min="1" defaultValue="1" /></div>
                <div className="space-y-1"><Label>{t.services.estCost}</Label><Input name="estimated_cost" type="number" step="0.01" min="0" defaultValue="0" /></div>
              </div>
              <div className="space-y-1"><Label>{t.services.justification}</Label><textarea name="justification" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button type="submit" className="w-full" disabled={createP.isPending}>{t.common.save}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.services.itemName}</th>
            <th className="p-3 font-medium">{t.services.qty}</th>
            <th className="p-3 font-medium">{t.services.cost}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{p.item_name}<span className="block text-xs text-muted-foreground max-w-[220px] truncate">{p.justification}</span></td>
                <td className="p-3">{p.quantity}</td>
                <td className="p-3">{Number(p.estimated_cost).toLocaleString()} ETB</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${P_STYLES[p.status]}`}>{t.services[p.status]}</span></td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  {p.status === "pending" && (<>
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: p.id, decision: "rejected" })}>{t.common.cancel}</Button>
                    <Button size="sm" onClick={() => decide.mutate({ id: p.id, decision: "approved" })}>{t.common.save}</Button>
                  </>)}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </>
  );
}
