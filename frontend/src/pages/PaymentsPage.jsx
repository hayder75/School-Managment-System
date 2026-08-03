import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment, usePaymentSummary, useStudentLedger } from "../hooks/useFees";
import { useFeeStructures } from "../hooks/useFees";
import { useUsers } from "../hooks/useUsers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, DollarSign, Download, Pencil, RotateCcw, Trash2 } from "lucide-react";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [filterStudentId, setFilterStudentId] = useState("");
  const { data, isLoading } = usePayments(
    filterStudentId ? { page, limit: 20, student_id: filterStudentId } : { page, limit: 20 }
  );
  const { data: summaryData } = usePaymentSummary();
  const { data: studentsData } = useUsers({ role: "student", limit: 500 });
  const { data: feesData } = useFeeStructures({ limit: 200 });
  const { data: ledgerData } = useStudentLedger(filterStudentId);
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const [open, setOpen] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({ student_id: "", fee_structure_id: "", amount_paid: "", payment_method: "cash", remarks: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const payments = data?.data || [];
  const meta = data?.meta || {};
  const students = studentsData?.data || [];
  const fees = feesData?.data || [];
  const summary = summaryData?.data || {};
  const ledger = ledgerData?.data || {};

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await createPayment.mutateAsync({
        ...form,
        amount_paid: parseFloat(form.amount_paid),
        fee_structure_id: form.fee_structure_id || null,
      });
      setOpen(false);
      setForm({ student_id: "", fee_structure_id: "", amount_paid: "", payment_method: "cash", remarks: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function startEdit(p) {
    setEditPayment(p);
    setForm({
      student_id: p.student_id,
      fee_structure_id: p.fee_structure_id || "",
      amount_paid: p.amount_paid,
      payment_method: p.payment_method || "cash",
      remarks: p.remarks || "",
    });
    setFieldErrors({});
    setOpen(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await updatePayment.mutateAsync({
        id: editPayment.id,
        amount_paid: parseFloat(form.amount_paid),
        payment_method: form.payment_method,
        remarks: form.remarks || null,
      });
      setOpen(false);
      setEditPayment(null);
      setForm({ student_id: "", fee_structure_id: "", amount_paid: "", payment_method: "cash", remarks: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  async function handleRefund(p) {
    if (!confirm(`Refund payment of ${parseFloat(p.amount_paid).toLocaleString()} for ${p.first_name} ${p.last_name}?`)) return;
    try {
      await updatePayment.mutateAsync({ id: p.id, status: "refunded" });
    } catch (err) {
      alert(err?.error?.message || err?.message || "Refund failed");
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Delete payment of ${parseFloat(p.amount_paid).toLocaleString()} for ${p.first_name} ${p.last_name}? This cannot be undone.`)) return;
    try {
      await deletePayment.mutateAsync(p.id);
    } catch (err) {
      alert(err?.error?.message || err?.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Record and track student payments</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditPayment(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editPayment ? "Edit Payment" : "Record Payment"}</DialogTitle></DialogHeader>
            <form onSubmit={editPayment ? handleEdit : handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })} disabled={!!editPayment}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="student_id" />
              <div className="space-y-2">
                <Label>Fee Structure (optional)</Label>
                <Select value={form.fee_structure_id} onValueChange={(v) => setForm({ ...form, fee_structure_id: v })} disabled={!!editPayment}>
                  <SelectTrigger><SelectValue placeholder="Select fee" /></SelectTrigger>
                  <SelectContent>
                    {fees.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} ({parseFloat(f.amount || 0).toLocaleString()})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="fee_structure_id" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input required type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
                  <FieldError errors={fieldErrors} field="amount_paid" />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mobile">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={fieldErrors} field="payment_method" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editPayment ? "Save Changes" : "Record Payment"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" />{summary.total_collected?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-red-500" />{summary.outstanding?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {ledger.structures?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Statement — {ledger.student?.first_name} {ledger.student?.last_name} ({ledger.student?.student_number || "—"})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Total Owed</p>
                <p className="text-lg font-bold">{Number(ledger.total_owed).toLocaleString()}</p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-green-600">{Number(ledger.total_paid).toLocaleString()}</p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold text-red-600">{Number(ledger.total_balance).toLocaleString()}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.structures.map((s) => (
                  <TableRow key={s.fee_structure_id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{s.frequency}</TableCell>
                    <TableCell>{Number(s.amount).toLocaleString()}</TableCell>
                    <TableCell>{Number(s.paid).toLocaleString()}</TableCell>
                    <TableCell>{Number(s.balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={s.status === "paid" ? "success" : s.status === "partial" ? "warning" : "secondary"}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <Select value={filterStudentId} onValueChange={(v) => { setFilterStudentId(v); setPage(1); }}>
              <SelectTrigger className="w-64"><SelectValue placeholder="All students" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                      <TableCell>{parseFloat(p.amount_paid || 0).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{p.payment_method}</TableCell>
                      <TableCell><Badge variant={p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell>{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Invoice" onClick={() => window.open(`/api/pdf/invoice/${p.student_id}`, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => startEdit(p)} disabled={p.status === "refunded"}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {p.status !== "refunded" ? (
                            <Button variant="ghost" size="icon" title="Refund" onClick={() => handleRefund(p)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" title="Delete" className="text-red-500" onClick={() => handleDelete(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No payments yet</TableCell></TableRow>
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
