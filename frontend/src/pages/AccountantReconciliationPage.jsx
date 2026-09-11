import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import {
  useDailyCollections, useReconcileDay, useReconciliationBatches,
  useDefaulterAging, useMonthlyClose,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function AccountantReconciliationPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("daily");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.acct.title}</h1>
        <p className="text-muted-foreground">{t.acct.subtitle}</p>
      </div>
      <div className="flex gap-2 border-b pb-2">
        {[["daily", t.acct.dailyTab], ["aging", t.acct.agingTab], ["close", t.acct.closeTab]].map(([k, l]) => (
          <Button key={k} variant={tab === k ? "default" : "ghost"} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>
      {tab === "daily" && <DailyTab today={today} />}
      {tab === "aging" && <AgingTab />}
      {tab === "close" && <ClosePack />}
    </div>
  );
}

function DailyTab({ today }) {
  const { t } = useI18n();
  const [date, setDate] = useState(today);
  const { data: collData } = useDailyCollections({ date });
  const { data: batchData } = useReconciliationBatches({});
  const reconcile = useReconcileDay();

  const rows = collData?.data || [];
  const batches = batchData?.data || [];
  const totalForDay = rows.reduce((a, r) => a + Number(r.total), 0);
  const allLocked = rows.every((r) => Number(r.locked_count) === Number(r.tx_count));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-600 block">{t.shift.dateCol}</label>
          <EthiopianDateInput className="w-56" value={date} onChange={setDate} />
        </div>
        <Button
          disabled={reconcile.isPending || !rows.length}
          variant={allLocked ? "outline" : "destructive"}
          onClick={() => {
            if (window.confirm(t.acct.confirmLock)) reconcile.mutate({ date, notes: null });
          }}>
          {allLocked ? t.acct.lockedLabel : t.acct.reconcileAndLock}
        </Button>
        <span className="text-sm text-muted-foreground ml-auto font-medium">
          {t.acct.dayTotal}: <strong>{totalForDay.toLocaleString()} ETB</strong>
        </span>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm min-w-[520px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.acct.cashier}</th>
            <th className="p-3 font-medium">{t.acct.method}</th>
            <th className="p-3 font-medium">{t.acct.txCount}</th>
            <th className="p-3 font-medium">{t.services.cost}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{r.cashier_name}</td>
                <td className="p-3">{r.method}</td>
                <td className="p-3">{r.tx_count}</td>
                <td className="p-3">{Number(r.total).toLocaleString()} ETB</td>
                <td className="p-3">
                  {Number(r.locked_count) === Number(r.tx_count)
                    ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">🔒 {t.acct.lockedShort}</span>
                    : <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{t.acct.unlocked}</span>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table></div>
      </CardContent></Card>

      <Card><CardHeader className="pb-1"><CardTitle className="text-base">{t.acct.batchHistory}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">{t.shift.dateCol}</th>
              <th className="p-3 font-medium">Cash</th><th className="p-3 font-medium">Telebirr</th>
              <th className="p-3 font-medium">CBE</th><th className="p-3 font-medium">{t.acct.byAcct}</th>
            </tr></thead>
            <tbody>
              {batches.slice(0, 10).map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-3">{b.batch_date?.slice(0, 10)}</td>
                  <td className="p-3">{Number(b.total_cash).toLocaleString()}</td>
                  <td className="p-3">{Number(b.total_telebirr).toLocaleString()}</td>
                  <td className="p-3">{Number(b.total_cbe).toLocaleString()}</td>
                  <td className="p-3 text-xs text-muted-foreground">{b.reconciled_by_name}</td>
                </tr>
              ))}
              {!batches.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t.common.noData}</td></tr>}
            </tbody>
          </table></div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgingTab() {
  const { t } = useI18n();
  const { data: agingData } = useDefaulterAging({});
  const aging = agingData?.data || {};
  const summary = aging.summary || {};
  const BUCKETS = [["current", t.acct.bucketCurrent, "bg-green-500"], ["d30", t.acct.bucket30, "bg-yellow-500"], ["d60", t.acct.bucket60, "bg-orange-500"], ["d90", t.acct.bucket90, "bg-red-500"]];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        {BUCKETS.map(([key, label, color]) => (
          <Card key={key}><CardContent className="pt-6">
            <div className={`w-full h-1.5 rounded ${color} mb-3`} />
            <p className="text-2xl font-bold">{summary[key] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </CardContent></Card>
        ))}
      </div>
      <p className="text-sm font-medium">{t.acct.totalOutstanding}: <span className="text-red-600">{Number(aging.total_outstanding || 0).toLocaleString()} ETB</span></p>

      <Card><CardContent className="p-0 max-h-[420px] overflow-y-auto">
        <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
          <thead className="sticky top-0"><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.security.studentCol}</th>
            <th className="p-3 font-medium">{t.qa.classCol}</th>
            <th className="p-3 font-medium">{t.acct.expected}</th>
            <th className="p-3 font-medium">{t.acct.paid}</th>
            <th className="p-3 font-medium">{t.acct.outstanding}</th>
            <th className="p-3 font-medium">{t.acct.daysOverdue}</th>
          </tr></thead>
          <tbody>
            {[...(aging.buckets?.d90 || []), ...(aging.buckets?.d60 || []), ...(aging.buckets?.d30 || [])].slice(0, 100).map((s) => (
              <tr key={s.student_id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{s.student_name}</td>
                <td className="p-3">{s.class_name}</td>
                <td className="p-3">{s.expected.toLocaleString()}</td>
                <td className="p-3">{s.paid.toLocaleString()}</td>
                <td className="p-3 text-red-600 font-medium">{s.outstanding.toLocaleString()}</td>
                <td className="p-3">{s.days_overdue > 900 ? "—" : s.days_overdue}</td>
              </tr>
            ))}
            {!(aging.buckets?.d90 || []).length && !(aging.buckets?.d60 || []).length && !(aging.buckets?.d30 || []).length && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>
            )}
          </tbody>
        </table></div>
      </CardContent></Card>
    </div>
  );
}

function ClosePack() {
  const { t } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { data: closeData } = useMonthlyClose({ year, month });
  const c = closeData?.data;

  if (!c) return null;
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex gap-3">
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
        <Input type="number" value={month} min="1" max="12" onChange={(e) => setMonth(Number(e.target.value))} className="w-24" />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle>{t.acct.closeTitle} — {year}/{String(month).padStart(2, "0")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[[
            t.acct.collectionsTotal, `${Number(c.collections?.total).toLocaleString()} ETB (${c.collections?.count})`],
            [t.acct.expensesTotal, `${Number(c.expenses?.total).toLocaleString()} ETB`],
            [t.acct.payrollPayout, `${Number(c.payroll_payout).toLocaleString()} ETB`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1.5"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
          ))}
          <div className="flex justify-between pt-2 text-base font-bold">
            <span>{t.acct.netPosition}</span>
            <span className={c.net_position >= 0 ? "text-green-600" : "text-red-600"}>{c.net_position.toLocaleString()} ETB</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-2 border-t mt-3">{t.acct.signatureLine}</p>
        </CardContent>
      </Card>
    </div>
  );
}
