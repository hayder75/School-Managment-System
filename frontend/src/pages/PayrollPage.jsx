import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useSalaryGrades, useCreateSalaryGrade, useDeleteSalaryGrade, usePayroll, useCreatePayroll, usePayrollSummary } from "../hooks/usePayroll";
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
import { Plus, Trash2, Wallet } from "lucide-react";

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
                    <TableCell>{parseFloat(g.basic_salary).toLocaleString()}</TableCell>
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
  const now = new Date();
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading } = usePayroll({ page, limit: 20, month, year });
  const { data: summaryData } = usePayrollSummary(month, year);
  const { data: staffData } = useUsers({ role: "teacher", limit: 500 });
  const { data: gradesData } = useSalaryGrades();
  const createPayroll = useCreatePayroll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ user_id: "", basic_pay: "", allowances_total: "0", deductions_total: "0", net_pay: "" });
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
        allowances_total: parseFloat(form.allowances_total),
        deductions_total: parseFloat(form.deductions_total),
        net_pay: parseFloat(form.net_pay) || basicPay,
      });
      setOpen(false);
      setForm({ user_id: "", basic_pay: "", allowances_total: "0", deductions_total: "0", net_pay: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function handleGradeSelect(gradeId) {
    const grade = grades.find((g) => g.id === gradeId);
    if (grade) {
      const basic = parseFloat(grade.basic_salary);
      setForm({ ...form, basic_pay: basic.toString(), net_pay: basic.toString() });
    }
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
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Basic Pay</Label>
                  <Input required type="number" value={form.basic_pay} onChange={(e) => setForm({ ...form, basic_pay: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="basic_pay" />
                <div className="space-y-2">
                  <Label>Allowances</Label>
                  <Input type="number" value={form.allowances_total} onChange={(e) => setForm({ ...form, allowances_total: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="allowances_total" />
                <div className="space-y-2">
                  <Label>Deductions</Label>
                  <Input type="number" value={form.deductions_total} onChange={(e) => setForm({ ...form, deductions_total: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="deductions_total" />
              </div>
              <div className="space-y-2">
                <Label>Net Pay</Label>
                <Input required type="number" value={form.net_pay} onChange={(e) => setForm({ ...form, net_pay: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="net_pay" />
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Pay</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                      <TableCell>{parseFloat(e.basic_pay).toLocaleString()}</TableCell>
                      <TableCell>{parseFloat(e.allowances_total || 0).toLocaleString()}</TableCell>
                      <TableCell>{parseFloat(e.deductions_total || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{parseFloat(e.net_pay).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={e.status === "paid" ? "success" : e.status === "cancelled" ? "destructive" : "secondary"}>{e.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {entries.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries for this period</TableCell></TableRow>
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
