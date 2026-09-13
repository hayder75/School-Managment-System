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
import { useI18n } from "../i18n/I18nContext";
import { levelsFromClasses, levelLabel } from "../lib/levels";
import { Plus, Trash2, DollarSign } from "lucide-react";

export default function FeeStructuresPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFeeStructures({ page, limit: 20 });
  const { data: summaryData } = usePaymentSummary();
  const { data: classesData } = useClasses({ limit: 200 });
  const createFee = useCreateFeeStructure();
  const deleteFee = useDeleteFeeStructure();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", frequency: "termly", class_id: "", late_fee: "0", is_mandatory: true });
  const [perGrade, setPerGrade] = useState(false);
  const [gradeAmounts, setGradeAmounts] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const fees = data?.data || [];
  const meta = data?.meta || {};
  const classes = classesData?.data || [];
  const summary = summaryData?.data || {};

  const gradeLevels = levelsFromClasses(classes);

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      const amounts = perGrade
        ? gradeLevels
            .filter((l) => gradeAmounts[l.key] !== undefined && gradeAmounts[l.key] !== "")
            .map((l) => ({ level_group: l.level_group, grade_level: l.grade_level, amount: parseFloat(gradeAmounts[l.key]) }))
        : undefined;
      await createFee.mutateAsync({
        ...form,
        amount: parseFloat(form.amount),
        late_fee: parseFloat(form.late_fee),
        class_id: form.class_id || null,
        amounts,
      });
      setOpen(false);
      resetForm();
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Fee Structures")}</h1>
          <p className="text-muted-foreground">{t("Manage school fees and charges")}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> {t("Add Fee Structure")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("Create Fee Structure")}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>{t("Fee Name")}</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("Tuition Fee")} />
              </div>
              <FieldError errors={fieldErrors} field="name" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Amount")}</Label>
                  <Input required={!perGrade} disabled={perGrade} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={perGrade ? t("Set per grade below") : ""} />
                  {perGrade && <p className="text-xs text-muted-foreground">{t("Default amount (used for levels left blank below)")}</p>}
                </div>
                <FieldError errors={fieldErrors} field="amount" />
                <div className="space-y-2">
                  <Label>{t("Frequency")}</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t("Monthly")}</SelectItem>
                      <SelectItem value="termly">{t("Termly")}</SelectItem>
                      <SelectItem value="yearly">{t("Yearly")}</SelectItem>
                      <SelectItem value="one-time">{t("One Time")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="frequency" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_mandatory} onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })} />
                {t("Mandatory (billed to every student)")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={perGrade} onChange={(e) => setPerGrade(e.target.checked)} />
                {t("Different amount per grade")}
              </label>
              {perGrade && (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{t("Enter the amount for each level. Levels left blank use the default amount above.")}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gradeLevels.length === 0 && <p className="text-sm text-muted-foreground col-span-full">{t("No graded classes found.")}</p>}
                    {gradeLevels.map((l) => (
                      <div key={l.key} className="space-y-1">
                        <Label className="text-xs">{l.label}</Label>
                        <Input type="number" value={gradeAmounts[l.key] ?? ""} onChange={(e) => setGradeAmounts({ ...gradeAmounts, [l.key]: e.target.value })} placeholder={t("Enter amount")} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Class (optional)")}</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("All classes")} /></SelectTrigger>
                    <SelectContent>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="class_id" />
              <div className="space-y-2">
                <Label>{t("Late Fee")}</Label>
                <Input type="number" value={form.late_fee} onChange={(e) => setForm({ ...form, late_fee: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="late_fee" />
              </div>
              <Button type="submit" className="w-full">{t("Create Fee Structure")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Total Collected")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" />{summary.total_collected?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Outstanding")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5 text-red-500" />{summary.outstanding?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Active Fees")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fees.filter((f) => f.is_active).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Fee Structures")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Name")}</TableHead>
                    <TableHead>{t("Amount")}</TableHead>
                    <TableHead>{t("Frequency")}</TableHead>
                    <TableHead>{t("Late Fee")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        {fee.name}
                        {fee.is_mandatory === false && <Badge variant="outline" className="ml-2">{t("Optional")}</Badge>}
                        {fee.amounts?.length > 0 && <span className="ml-2 text-xs text-muted-foreground">{t("per grade")}</span>}
                      </TableCell>
                      <TableCell>
                        <span>{parseFloat(fee.amount || 0).toLocaleString()}</span>
                        {fee.amounts?.length > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {fee.amounts.map((a) => `${levelLabel(a.level_group, a.grade_level)}: ${Number(a.amount).toLocaleString()}`).join(" · ")}
                          </span>
                        )}
                      </TableCell>
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
