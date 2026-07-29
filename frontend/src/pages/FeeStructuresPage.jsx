import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useFeeStructures, useCreateFeeStructure, useDeleteFeeStructure, usePaymentSummary } from "../hooks/useFees";
import { useClasses } from "../hooks/useClasses";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash2, DollarSign } from "lucide-react";

export default function FeeStructuresPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFeeStructures({ page, limit: 20 });
  const { data: summaryData } = usePaymentSummary();
  const { data: classesData } = useClasses({ limit: 200 });
  const createFee = useCreateFeeStructure();
  const deleteFee = useDeleteFeeStructure();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", frequency: "termly", class_id: "", late_fee: "0" });
  const [fieldErrors, setFieldErrors] = useState({});

  const fees = data?.data || [];
  const meta = data?.meta || {};
  const classes = classesData?.data || [];
  const summary = summaryData?.data || {};

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await createFee.mutateAsync({
        ...form,
        amount: parseFloat(form.amount),
        late_fee: parseFloat(form.late_fee),
        class_id: form.class_id || null,
      });
      setOpen(false);
      setForm({ name: "", amount: "", frequency: "termly", class_id: "", late_fee: "0" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Structures</h1>
          <p className="text-muted-foreground">Manage school fees and charges</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Fee Structure</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Fee Structure</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Fee Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tuition Fee" />
              </div>
              <FieldError errors={fieldErrors} field="name" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input required type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="amount" />
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="termly">Termly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one-time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="frequency" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class (optional)</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                    <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="class_id" />
              <div className="space-y-2">
                <Label>Late Fee</Label>
                <Input type="number" value={form.late_fee} onChange={(e) => setForm({ ...form, late_fee: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="late_fee" />
              </div>
              <Button type="submit" className="w-full">Create Fee Structure</Button>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Fees</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fees.filter((f) => f.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Fee Structures</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Late Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{fee.name}</TableCell>
                      <TableCell>{parseFloat(fee.amount).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{fee.frequency}</TableCell>
                      <TableCell>{parseFloat(fee.late_fee || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={fee.is_active ? "success" : "secondary"}>{fee.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteFee.mutate(fee.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fees.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No fee structures yet</TableCell></TableRow>
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
