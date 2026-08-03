import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useExpenses, useCreateExpense, useDeleteExpense, useExpenseTotals } from "../hooks/useExpenses";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash2, TrendingDown } from "lucide-react";

const CATEGORIES = ["Utilities", "Supplies", "Maintenance", "Salaries", "Transport", "Food", "Events", "Technology", "Other"];

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExpenses({ page, limit: 20 });
  const { data: totalsData } = useExpenseTotals();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "", description: "", amount: "", paid_to: "", expense_date: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const expenses = data?.data || [];
  const meta = data?.meta || {};
  const totals = totalsData?.data || [];

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await createExpense.mutateAsync({
        ...form,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date || undefined,
      });
      setOpen(false);
      setForm({ category: "", description: "", amount: "", paid_to: "", expense_date: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  const totalSpent = totals.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track school expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="category" />
              <div className="space-y-2">
                <Label>Description</Label>
                <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="description" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="amount" />
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
              </div>
              <FieldError errors={fieldErrors} field="expense_date" />
              <div className="space-y-2">
                <Label>Paid To</Label>
                <Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} placeholder="Vendor name" />
              </div>
              <FieldError errors={fieldErrors} field="paid_to" />
              <Button type="submit" className="w-full">Add Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Spent</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" />{totalSpent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {totals.slice(0, 5).map((t) => (
                <div key={t.category} className="flex justify-between text-sm">
                  <span>{t.category}</span>
                  <span className="font-medium">{parseFloat(t.total || 0).toLocaleString()}</span>
                </div>
              ))}
              {totals.length === 0 && <p className="text-sm text-muted-foreground">No expenses yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Expense List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{exp.category}</span></TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell>{parseFloat(exp.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{exp.paid_to || "—"}</TableCell>
                      <TableCell>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(exp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No expenses yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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
