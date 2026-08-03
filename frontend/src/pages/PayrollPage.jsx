import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useSalaryGrades, useCreateSalaryGrade, useDeleteSalaryGrade, usePayroll, useCreatePayroll, useCalculatePayroll, usePayrollSummary } from "../hooks/usePayroll";
import { useUsers } from "../hooks/useUsers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Trash2, Wallet, Download, ChevronDown, ChevronRight } from "lucide-react";

const ALLOWANCE_FIELDS = [
  { key: "transport_allowance", label: "Transport Allowance" },
  { key: "overtime", label: "Overtime" },
  { key: "back_pay", label: "Back Pay" },
  { key: "unit_leader_allowance", label: "Unit Leader Allowance" },
  { key: "department_head_allowance", label: "Department Head Allowance" },
  { key: "housing_allowance", label: "Housing Allowance" },
  { key: "account_allowance", label: "Account Allowance" },
  { key: "phone_allowance", label: "Phone Allowance" },
];

const DEDUCTION_FIELDS = [
  { key: "income_tax", label: "Income Tax" },
  { key: "eder", label: "Eder" },
  { key: "office_loan", label: "Office Loan" },
  { key: "cafe_loan", label: "Cafe Loan" },
  { key: "school_pay", label: "School Pay" },
  { key: "pension_employee", label: "Pension (Employee)" },
  { key: "ne_starving", label: "N.E. Starving" },
  { key: "pension_employer", label: "Pension (Employer, not deducted)" },
];

const DEDUCTION_TOTAL_FIELDS = DEDUCTION_FIELDS.filter((f) => f.key !== "pension_employer");

const EMPTY_BREAKDOWN = Object.fromEntries([
  ...ALLOWANCE_FIELDS.map((f) => [f.key, ""]),
  ...DEDUCTION_FIELDS.map((f) => [f.key, ""]),
]);

function computeTotals(form) {
  const basic = parseFloat(form.basic_pay) || 0;
  const allowances = ALLOWANCE_FIELDS.reduce((s, f) => s + (parseFloat(form[f.key]) || 0), 0);
  const deductions = DEDUCTION_TOTAL_FIELDS.reduce((s, f) => s + (parseFloat(form[f.key]) || 0), 0);
  return {
    allowances_total: allowances.toFixed(2),
    deductions_total: deductions.toFixed(2),
    net_pay: (basic + allowances - deductions).toFixed(2),
  };
}

function SalaryGradesTab() {
  const { data: gradesData, isLoading } = useSalaryGrades();
  const createGrade = useCreateSalaryGrade();
  const deleteGrade = useDeleteSalaryGrade();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", basic_salary: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const grades = gradesData?.data || [];

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await createGrade.mutateAsync({ ...form, basic_salary: parseFloat(form.basic_salary) });
      setOpen(false);
      setForm({ name: "", basic_salary: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Grade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Salary Grade</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Grade Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Teacher Grade 1" />
              </div>
              <FieldError errors={fieldErrors} field="name" />
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input required type="number" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="basic_salary" />
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground p-4">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Name</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{parseFloat(g.basic_salary || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={g.is_active ? "success" : "secondary"}>{g.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteGrade.mutate(g.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {grades.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No grades yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollEntriesTab() {
  const navigate = useNavigate();
  const now = new Date();
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = usePayroll({ page, limit: 20, month, year });
  const { data: summaryData } = usePayrollSummary(month, year);
  const { data: staffData } = useUsers({ role: "teacher", limit: 500 });
  const { data: gradesData } = useSalaryGrades();
  const createPayroll = useCreatePayroll();
  const calculatePayroll = useCalculatePayroll();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ user_id: "", basic_pay: "", allowances_total: "0", deductions_total: "0", net_pay: "", ...EMPTY_BREAKDOWN, bank_account: "", bank_name: "", work_days: "", absent_days: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const entries = data?.data || [];
  const meta = data?.meta || {};
  const staff = staffData?.data || [];
  const grades = gradesData?.data || [];
  const summary = summaryData?.data || {};

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      const basicPay = parseFloat(form.basic_pay);
      await createPayroll.mutateAsync({
        user_id: form.user_id,
        month,
        year,
        basic_pay: basicPay,
        ...Object.fromEntries(
          [...ALLOWANCE_FIELDS, ...DEDUCTION_FIELDS]
            .map((f) => [f.key, form[f.key] !== "" ? parseFloat(form[f.key]) : undefined])
        ),
        work_days: form.work_days !== "" ? parseInt(form.work_days, 10) : undefined,
        absent_days: form.absent_days !== "" ? parseInt(form.absent_days, 10) : undefined,
        bank_account: form.bank_account || undefined,
        bank_name: form.bank_name || undefined,
      });
      setOpen(false);
      setForm({ user_id: "", basic_pay: "", allowances_total: "0", deductions_total: "0", net_pay: "", ...EMPTY_BREAKDOWN, bank_account: "", bank_name: "", work_days: "", absent_days: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function handleGradeSelect(gradeId) {
    const grade = grades.find((g) => g.id === gradeId);
    if (grade) {
      const basic = parseFloat(grade.basic_salary || 0);
      const totals = computeTotals({ ...form, basic_pay: basic });
      setForm({ ...form, basic_pay: basic.toString(), ...totals });
    }
  }

  async function handleCalculateTax() {
    const basicPay = parseFloat(form.basic_pay) || 0;
    if (basicPay <= 0) return;
    try {
      const { data } = await calculatePayroll.mutateAsync({
        basic_pay: basicPay,
        overtime: parseFloat(form.overtime) || 0,
      });
      const next = {
        ...form,
        income_tax: data.income_tax != null ? data.income_tax.toString() : "",
        pension_employee: data.pension_employee != null ? data.pension_employee.toString() : "",
        pension_employer: data.pension_employer != null ? data.pension_employer.toString() : "",
      };
      const totals = computeTotals(next);
      setForm({ ...next, ...totals });
    } catch {
      setFieldErrors({ form: "Could not calculate tax. Check tax brackets are configured." });
    }
  }

  function handleFormField(key, value) {
    const next = { ...form, [key]: value };
    const totals = computeTotals(next);
    setForm({ ...next, ...totals });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Payroll Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="user_id" />
              <div className="space-y-2">
                <Label>Salary Grade (optional, auto-fills pay)</Label>
                <Select onValueChange={handleGradeSelect}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Pay</Label>
                  <Input required type="number" value={form.basic_pay} onChange={(e) => handleFormField("basic_pay", e.target.value)} />
                </div>
                <FieldError errors={fieldErrors} field="basic_pay" />
                <div className="space-y-2">
                  <Label>Work Days</Label>
                  <Input type="number" value={form.work_days} onChange={(e) => handleFormField("work_days", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Absent Days</Label>
                  <Input type="number" value={form.absent_days} onChange={(e) => handleFormField("absent_days", e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                <div className="text-sm">
                  <p className="font-medium">Auto calculate tax & pension</p>
                  <p className="text-muted-foreground text-xs">Fills income tax (from tax brackets) and pension 7% / 11% from basic + overtime. You can still edit them after.</p>
                </div>
                <Button type="button" size="sm" onClick={handleCalculateTax} disabled={calculatePayroll.isPending}>
                  {calculatePayroll.isPending ? "Calculating..." : "Calculate Tax & Pension"}
                </Button>
              </div>
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Allowances</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {ALLOWANCE_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      <Input type="number" value={form[f.key]} onChange={(e) => handleFormField(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Deductions</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {DEDUCTION_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      <Input type="number" value={form[f.key]} onChange={(e) => handleFormField(f.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 bg-muted rounded-md p-3">
                <div>
                  <Label className="text-xs">Allowances Total</Label>
                  <p className="text-lg font-semibold">{parseFloat(form.allowances_total || 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs">Deductions Total</Label>
                  <p className="text-lg font-semibold">{parseFloat(form.deductions_total || 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs">Net Pay</Label>
                  <p className="text-lg font-bold">{parseFloat(form.net_pay || 0).toLocaleString()}</p>
                </div>
              </div>
              <Button type="submit" className="w-full">Add Entry</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Employees</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.employee_count || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Gross</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5" />{summary.total_gross?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Net</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_net?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground p-4">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Pay</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <Fragment key={e.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                            {expandedId === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/staff/${e.user_id}`)}>
                            {e.first_name} {e.last_name}
                          </Button>
                        </TableCell>
                        <TableCell>{parseFloat(e.basic_pay || 0).toLocaleString()}</TableCell>
                        <TableCell>{parseFloat(e.allowances_total || 0).toLocaleString()}</TableCell>
                        <TableCell>{parseFloat(e.deductions_total || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{parseFloat(e.net_pay || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={e.status === "paid" ? "success" : e.status === "cancelled" ? "destructive" : "secondary"}>{e.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/api/pdf/payslip/${e.id}`, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === e.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">Allowances</p>
                                {ALLOWANCE_FIELDS.map((f) => (
                                  <p key={f.key} className="flex justify-between gap-4"><span>{f.label}</span><span>{(parseFloat(e[f.key]) || 0).toLocaleString()}</span></p>
                                ))}
                                {e.work_days != null && <p className="flex justify-between gap-4"><span>Work Days</span><span>{e.work_days}</span></p>}
                                {e.absent_days != null && <p className="flex justify-between gap-4"><span>Absent Days</span><span>{e.absent_days}</span></p>}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">Deductions</p>
                                {DEDUCTION_FIELDS.map((f) => (
                                  <p key={f.key} className="flex justify-between gap-4"><span>{f.label}</span><span>{(parseFloat(e[f.key]) || 0).toLocaleString()}</span></p>
                                ))}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">Bank</p>
                                <p>Account: {e.bank_account || "—"}</p>
                                <p>Bank: {e.bank_name || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  {entries.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No entries for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between p-4">
                  <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll</h1>
        <p className="text-muted-foreground">Manage salary grades and payroll entries</p>
      </div>
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Payroll Entries</TabsTrigger>
          <TabsTrigger value="grades">Salary Grades</TabsTrigger>
        </TabsList>
        <TabsContent value="entries"><PayrollEntriesTab /></TabsContent>
        <TabsContent value="grades"><SalaryGradesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
