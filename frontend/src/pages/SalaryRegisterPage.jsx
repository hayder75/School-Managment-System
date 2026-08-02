import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePayroll } from "../hooks/usePayroll";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Download, Users } from "lucide-react";

const money = (v) => (parseFloat(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ALLOWANCE_COLS = [
  { key: "transport_allowance", label: "Transp." },
  { key: "overtime", label: "OT" },
  { key: "back_pay", label: "Back Pay" },
  { key: "unit_leader_allowance", label: "Unit Ldr" },
  { key: "department_head_allowance", label: "DH" },
];

const DEDUCTION_COLS = [
  { key: "income_tax", label: "Income Tax" },
  { key: "eder", label: "Eder" },
  { key: "office_loan", label: "Off Loan" },
  { key: "cafe_loan", label: "Café Loan" },
  { key: "pension_employee", label: "Pens 7%" },
  { key: "pension_employer", label: "Pens 11%" },
  { key: "ne_starving", label: "N.E. Starv" },
];

export default function SalaryRegisterPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = usePayroll({ month, year, limit: 500 });

  const rows = data?.data || [];
  const totals = rows.reduce(
    (acc, r) => {
      acc.basic += parseFloat(r.basic_pay) || 0;
      acc.allowances += parseFloat(r.allowances_total) || 0;
      acc.deductions += parseFloat(r.deductions_total) || 0;
      acc.net += parseFloat(r.net_pay) || 0;
      return acc;
    },
    { basic: 0, allowances: 0, deductions: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Register</h1>
          <p className="text-muted-foreground">Monthly payroll sheet with each employee's earnings and deductions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Month</Label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-24 h-9" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Employees</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Gross</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{money(totals.basic + totals.allowances)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Deductions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{money(totals.deductions)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Net Pay</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{money(totals.net)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Salary Sheet — {new Date(2000, month - 1).toLocaleString("default", { month: "long" })} {year}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No payroll entries for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap">Job Title</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Basic</TableHead>
                    {ALLOWANCE_COLS.map((c) => <TableHead key={c.key} className="whitespace-nowrap text-right">{c.label}</TableHead>)}
                    <TableHead className="whitespace-nowrap text-right">Gross</TableHead>
                    {DEDUCTION_COLS.map((c) => <TableHead key={c.key} className="whitespace-nowrap text-right">{c.label}</TableHead>)}
                    <TableHead className="whitespace-nowrap text-right">Total Ded</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Net Pay</TableHead>
                    <TableHead className="whitespace-nowrap">Bank Acct</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const gross = (parseFloat(r.basic_pay) || 0) + (parseFloat(r.allowances_total) || 0);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <Button variant="link" className="p-0 h-auto whitespace-nowrap" onClick={() => navigate(`/staff/${r.user_id}`)}>
                            {r.first_name} {r.last_name}
                          </Button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.job_title || "—"}</TableCell>
                        <TableCell className="text-right">{money(r.basic_pay)}</TableCell>
                        {ALLOWANCE_COLS.map((c) => <TableCell key={c.key} className="text-right">{money(r[c.key])}</TableCell>)}
                        <TableCell className="text-right font-medium">{money(gross)}</TableCell>
                        {DEDUCTION_COLS.map((c) => <TableCell key={c.key} className="text-right">{money(r[c.key])}</TableCell>)}
                        <TableCell className="text-right">{money(r.deductions_total)}</TableCell>
                        <TableCell className="text-right font-semibold">{money(r.net_pay)}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.bank_account || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/api/pdf/payslip/${r.id}`, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell className="text-right">{money(totals.basic)}</TableCell>
                    {ALLOWANCE_COLS.map((c) => <TableCell key={c.key}></TableCell>)}
                    <TableCell className="text-right">{money(totals.basic + totals.allowances)}</TableCell>
                    {DEDUCTION_COLS.map((c) => <TableCell key={c.key}></TableCell>)}
                    <TableCell className="text-right">{money(totals.deductions)}</TableCell>
                    <TableCell className="text-right">{money(totals.net)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
