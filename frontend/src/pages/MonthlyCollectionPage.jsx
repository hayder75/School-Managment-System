import { useState, useMemo, useEffect } from "react";
import { useClasses } from "../hooks/useClasses";
import { useMonthlyCollection, useGenerateMonthlyBills, useMarkMonthsPaid, useStudentBills } from "../hooks/useFees";
import { useToast } from "../store/toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { useI18n } from "../i18n/I18nContext";
import { ETHIOPIAN_MONTHS, toEthiopian } from "../lib/ethiopianCalendar";

export default function MonthlyCollectionPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const todayEth = toEthiopian(new Date());
  const [year, setYear] = useState(todayEth.year);
  const [month, setMonth] = useState(todayEth.month);
  const [classId, setClassId] = useState("");
  const [payStudent, setPayStudent] = useState(null);

  const { data: classesData } = useClasses({ limit: 200 });
  const classes = classesData?.data || [];
  const params = { period_year: year, period_month: month, ...(classId ? { class_id: classId } : {}) };
  const { data, isLoading, refetch } = useMonthlyCollection(params);
  const generate = useGenerateMonthlyBills();

  const collection = data?.data || {};
  const bills = collection.bills || [];
  const summary = collection.summary || {};
  const years = useMemo(() => {
    const arr = [];
    for (let y = todayEth.year + 1; y >= todayEth.year - 3; y--) arr.push(y);
    return arr;
  }, [todayEth.year]);

  async function handleGenerate() {
    try {
      const res = await generate.mutateAsync({ period_year: year, period_month: month, class_id: classId || null });
      toast(`${res?.data?.created ?? 0} ${t("bills generated")}`, "success");
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Could not generate bills"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Monthly Collection")}</h1>
        <p className="text-muted-foreground">{t("Generate monthly bills and record payments")}</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>{t("Month")}</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ETHIOPIAN_MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Year")}</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Class")}</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-56"><SelectValue placeholder={t("All Classes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All Classes")}</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => refetch()}>{t("Refresh")}</Button>
          <Button onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending ? t("Generating...") : t("Generate Bills")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Expected")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{Number(summary.expected || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Collected")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{Number(summary.collected || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Outstanding")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{Number(summary.outstanding || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Unpaid")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.unpaid_count || 0} / {summary.total_count || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Students")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : bills.length === 0 ? (
            <p className="text-muted-foreground">{t("No bills for this month yet. Click 'Generate Bills'.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Student")}</TableHead>
                    <TableHead>{t("Class")}</TableHead>
                    <TableHead>{t("Amount")}</TableHead>
                    <TableHead>{t("Penalty")}</TableHead>
                    <TableHead>{t("Total Due")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {b.first_name} {b.last_name}
                        <span className="block text-xs text-muted-foreground font-mono">{b.student_number || "—"}</span>
                      </TableCell>
                      <TableCell>{b.class_name || "—"}</TableCell>
                      <TableCell>{Number(b.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-amber-600">{Number(b.live_penalty || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{Number(b.total_due || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {b.status === "paid"
                          ? <Badge variant="success">{t("Paid")}</Badge>
                          : <Badge variant="secondary">{t("Unpaid")}</Badge>}
                      </TableCell>
                      <TableCell>
                        {b.status !== "paid" && (
                          <Button size="sm" onClick={() => setPayStudent(b)}>{t("Mark Paid")}</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {payStudent && (
        <PayDialog
          student={payStudent}
          defaultPeriod={collection.period}
          onClose={() => setPayStudent(null)}
          onError={(m) => toast(m, "error")}
          onDone={() => { setPayStudent(null); refetch(); }}
        />
      )}
    </div>
  );
}

function PayDialog({ student, defaultPeriod, onClose, onDone, onError }) {
  const { t } = useI18n();
  const { data, isLoading } = useStudentBills(student.student_id || student.id);
  const markPaid = useMarkMonthsPaid();
  const bills = data?.data || [];
  const unpaid = bills.filter((b) => b.status !== "paid");
  const [selected, setSelected] = useState(() => new Set(defaultPeriod ? [defaultPeriod] : []));
  const [penalties, setPenalties] = useState({});
  const [method, setMethod] = useState("cash");

  // Prefill penalties once the student's bills load.
  useEffect(() => {
    const init = {};
    for (const b of bills) {
      if (b.status !== "paid") init[b.period] = String(b.live_penalty ?? 0);
    }
    setPenalties(init);
  }, [bills]);

  function toggle(period) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(period)) n.delete(period); else n.add(period);
      return n;
    });
  }

  const total = unpaid.filter((b) => selected.has(b.period))
    .reduce((sum, b) => sum + Number(b.amount) + Number(penalties[b.period] ?? b.live_penalty ?? 0), 0);

  async function submit() {
    const periods = [...selected];
    if (periods.length === 0) { onError(t("Select at least one month")); return; }
    try {
      const pen = {};
      for (const p of periods) pen[p] = Number(penalties[p] ?? 0);
      await markPaid.mutateAsync({ student_id: student.student_id || student.id, periods, penalties: pen, payment_method: method });
      onDone();
    } catch (err) {
      onError(err?.error?.message || err?.message || t("Could not record payment"));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("Record Payment")} — {student.first_name} {student.last_name}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground">{t("Loading...")}</p>
        ) : unpaid.length === 0 ? (
          <p className="text-muted-foreground">{t("No unpaid months")}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("Tick the months being paid. Penalty is pre-filled and can be adjusted.")}</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {unpaid.map((b) => (
                <div key={b.period} className="flex items-center gap-3 border rounded-lg p-2">
                  <input type="checkbox" className="h-4 w-4" checked={selected.has(b.period)} onChange={() => toggle(b.period)} />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{b.period}</span>
                    <span className="text-muted-foreground"> · {Number(b.amount).toLocaleString()}</span>
                  </div>
                  <div className="w-32">
                    <Input type="number" min="0" value={penalties[b.period] ?? ""} onChange={(e) => setPenalties({ ...penalties, [b.period]: e.target.value })} placeholder={String(b.live_penalty ?? 0)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>{t("Payment Method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("Cash")}</SelectItem>
                  <SelectItem value="bank">{t("Bank Transfer")}</SelectItem>
                  <SelectItem value="mobile">{t("Mobile Money")}</SelectItem>
                  <SelectItem value="card">{t("Card")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>{t("Total")}</span><span>{Number(total).toLocaleString()}</span>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
              <Button onClick={submit} disabled={markPaid.isPending}>{markPaid.isPending ? t("Saving...") : t("Take payment")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
