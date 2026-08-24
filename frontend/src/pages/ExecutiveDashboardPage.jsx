import { useI18n } from "../i18n/I18nContext";
import {
  useExecutiveKpis, useExecutiveTrend, usePendingExpenses,
  useDecideExpenseGM, usePendingPayrolls, useDecidePayrollGM,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { TrendingUp, TrendingDown, Users, GraduationCap, CheckCircle2, Wallet } from "lucide-react";

export default function ExecutiveDashboardPage() {
  const { t } = useI18n();
  const { data: kpiData } = useExecutiveKpis();
  const { data: trendData } = useExecutiveTrend({ months: 6 });
  const { data: pendExpData } = usePendingExpenses();
  const { data: pendPayData } = usePendingPayrolls();
  const decideExp = useDecideExpenseGM();
  const decidePay = useDecidePayrollGM();

  const k = kpiData?.data || {};
  const trend = trendData?.data || [];
  const maxTrend = Math.max(...trend.map((r) => Number(r.total)), 1);
  const pendingExpenses = pendExpData?.data || [];
  const pendingPayrolls = pendPayData?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.exec.title}</h1>
        <p className="text-muted-foreground">{t.exec.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-green-500" /><div><p className="text-xl font-bold">{Number(k.collections_mtd).toLocaleString()}</p><p className="text-xs text-muted-foreground">{t.exec.collectionsMtd}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-red-500" /><div><p className="text-xl font-bold">{Number(k.expenses_mtd).toLocaleString()}</p><p className="text-xs text-muted-foreground">{t.exec.expensesMtd}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-blue-500" /><div><p className="text-xl font-bold">{k.active_students}</p><p className="text-xs text-muted-foreground">{t.exec.activeStudents}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-purple-500" /><div><p className="text-xl font-bold">{k.staff_headcount}</p><p className="text-xs text-muted-foreground">{t.exec.staffHeadcount}</p></div></div></CardContent></Card>
      </div>

      {trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet size={16} />{t.exec.collectionTrend}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {trend.map((r) => (
                <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{Number(r.total).toLocaleString()}</span>
                  <div className="w-full bg-neutral-900 rounded-t" style={{ height: `${(Number(r.total) / maxTrend) * 100}%` }} />
                  <span className="text-[10px] font-medium">{r.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.exec.pendingExpenseApprovals} ({pendingExpenses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingExpenses.map((e) => (
              <div key={e.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.category} · {e.paid_to} · {new Date(e.expense_date).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-red-600 whitespace-nowrap">{Number(e.amount).toLocaleString()} ETB</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" disabled={decideExp.isPending}
                    onClick={() => decideExp.mutate({ id: e.id, decision: "rejected" })}>{t.common.cancel}</Button>
                  <Button size="sm" disabled={decideExp.isPending}
                    onClick={() => decideExp.mutate({ id: e.id, decision: "approved" })}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />{t.exec.approveBtn}
                  </Button>
                </div>
              </div>
            ))}
            {!pendingExpenses.length && <p className="py-4 text-sm text-muted-foreground">{t.exec.nothingPending}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.exec.pendingPayrollSignoff} ({pendingPayrolls.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPayrolls.map((p) => (
              <div key={p.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{p.month}/{p.year} — payroll run</p>
                    <p className="text-xs text-muted-foreground">status: {p.status}</p>
                  </div>
                  <span className="font-bold whitespace-nowrap">{Number(p.net_pay).toLocaleString()} ETB</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" disabled={decidePay.isPending}
                    onClick={() => decidePay.mutate({ id: p.id, decision: "rejected" })}>{t.common.cancel}</Button>
                  <Button size="sm" disabled={decidePay.isPending}
                    onClick={() => decidePay.mutate({ id: p.id, decision: "approved" })}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />{t.exec.signOffBtn}
                  </Button>
                </div>
              </div>
            ))}
            {!pendingPayrolls.length && <p className="py-4 text-sm text-muted-foreground">{t.exec.nothingPending}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
