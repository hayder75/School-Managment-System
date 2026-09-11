import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { useI18n } from "../i18n/I18nContext";
import { usePayments, useCreateBulkPayments, useUpdatePayment, useDeletePayment, usePaymentSummary, useStudentLedger } from "../hooks/useFees";
import { useFeeStructures } from "../hooks/useFees";
import { useStudents } from "../hooks/useStudents";
import { useToast } from "../store/toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, DollarSign, Download, Pencil, RotateCcw, Trash2, Search, X, Check, Users, ChevronDown, ChevronRight } from "lucide-react";

export default function PaymentsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterCollectorId, setFilterCollectorId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFeeId, setFilterFeeId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { data, isLoading } = usePayments(
    {
      page,
      limit: 20,
      ...(filterStudentId ? { student_id: filterStudentId } : {}),
      ...(filterCollectorId ? { collected_by: filterCollectorId } : {}),
      ...(filterMonth ? { month: filterMonth, year: new Date().getFullYear() } : {}),
      ...(filterFeeId ? { fee_structure_id: filterFeeId } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
    }
  );
  const { data: summaryData } = usePaymentSummary();
  const { data: feesData } = useFeeStructures({ limit: 200 });
  const { data: ledgerData } = useStudentLedger(filterStudentId);
  const createBulkPayments = useCreateBulkPayments();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const [open, setOpen] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [form, setForm] = useState({ student_id: "", fee_structure_id: "", amount_paid: "", payment_method: "cash", remarks: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([]);
  const [bulkFeeIds, setBulkFeeIds] = useState([]);
  const [bulkAmounts, setBulkAmounts] = useState({});
  const [bulkMethod, setBulkMethod] = useState("cash");
  const [bulkRemarks, setBulkRemarks] = useState("");

  const { data: searchData, isLoading: searching } = useStudents(
    { search: studentSearch || filterSearch, limit: 20 },
    { enabled: (studentSearch || filterSearch).trim().length > 0 }
  );

  const payments = data?.data || [];
  const meta = data?.meta || {};
  const fees = feesData?.data || [];
  const summary = summaryData?.data || {};
  const ledger = ledgerData?.data || {};
  const searchResults = searchData?.data || [];

  function startEdit(p) {
    setEditPayment(p);
    setForm({
      student_id: p.student_id,
      fee_structure_id: p.fee_structure_id || "",
      amount_paid: p.amount_paid,
      payment_method: p.payment_method || "cash",
      remarks: p.remarks || "",
    });
    setSelectedStudent({ user_id: p.student_id, first_name: p.first_name, last_name: p.last_name });
    setStudentSearch("");
    setFieldErrors({});
    setOpen(true);
  }

  function gridKey(uid, feeId) {
    return `${uid}::${feeId || "none"}`;
  }

  function addBulkStudent(s) {
    if (bulkStudents.some((x) => x.user_id === s.user_id)) return;
    setBulkStudents((prev) => [...prev, s]);
    setStudentSearch("");
    setSearchOpen(false);
    setFieldErrors((e) => ({ ...e, students: undefined }));
  }

  function removeBulkStudent(uid) {
    setBulkStudents((prev) => prev.filter((s) => s.user_id !== uid));
    setBulkAmounts((a) => {
      const next = { ...a };
      for (const k of Object.keys(next)) {
        if (k.startsWith(uid + "::")) delete next[k];
      }
      return next;
    });
  }

  function toggleFee(fid) {
    setBulkFeeIds((prev) => (prev.includes(fid) ? prev.filter((x) => x !== fid) : [...prev, fid]));
  }

  function setCellAmount(uid, feeId, value) {
    setBulkAmounts((a) => ({ ...a, [gridKey(uid, feeId)]: value }));
  }

  function buildPayments() {
    const payments = [];
    for (const s of bulkStudents) {
      const feeList = bulkFeeIds.length ? bulkFeeIds : [null];
      for (const fid of feeList) {
        const amt = parseFloat(bulkAmounts[gridKey(s.user_id, fid)] || "");
        if (amt > 0) {
          payments.push({
            student_id: s.user_id,
            fee_structure_id: fid,
            amount_paid: amt,
            payment_method: bulkMethod,
            remarks: bulkRemarks?.trim() ? bulkRemarks.trim() : undefined,
          });
        }
      }
    }
    return payments;
  }

  function resetBulk() {
    setBulkStudents([]);
    setBulkFeeIds([]);
    setBulkAmounts({});
    setBulkMethod("cash");
    setBulkRemarks("");
  }

  async function handleBulkCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    if (bulkStudents.length === 0) {
      setFieldErrors({ students: "Select at least one student" });
      return;
    }
    const payments = buildPayments();
    if (payments.length === 0) {
      setFieldErrors({ amounts: "Enter an amount for at least one row" });
      return;
    }
    try {
      const res = await createBulkPayments.mutateAsync(payments);
      setOpen(false);
      setEditPayment(null);
      resetBulk();
      toast(`Saved ${res?.data?.count || payments.length} payment(s), total ${Number(res?.data?.total || 0).toLocaleString()}`);
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
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

  const bulkPaymentsList = buildPayments();
  const bulkTotal = bulkPaymentsList.reduce((s, p) => s + p.amount_paid, 0);

  const groupedPayments = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      const dateKey = p.paid_date ? p.paid_date.slice(0, 10) : "unknown";
      const key = `${p.student_id}::${dateKey}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return Array.from(map.values()).map((items) => ({
      student_id: items[0].student_id,
      first_name: items[0].first_name,
      last_name: items[0].last_name,
      dateKey: items[0].paid_date ? items[0].paid_date.slice(0, 10) : null,
      total: items.reduce((s, x) => s + parseFloat(x.amount_paid || 0), 0),
      items,
    }));
  }, [payments]);

  const [collapsed, setCollapsed] = useState(() => new Set());
  function toggleGroup(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Payments")}</h1>
          <p className="text-muted-foreground">{t("Record and track student payments")}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditPayment(null); setSelectedStudent(null); setStudentSearch(""); setSearchOpen(false); resetBulk(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> {t("Record Payment")}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader><DialogTitle>{editPayment ? t("Edit Payment") : t("Record Payment")}</DialogTitle></DialogHeader>
            <form onSubmit={editPayment ? handleEdit : handleBulkCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}

              {editPayment ? (
                <>
                  <div className="space-y-2">
                    <Label>{t("Student")}</Label>
                    <Input value={`${selectedStudent?.first_name || ""} ${selectedStudent?.last_name || ""}`} disabled />
                  </div>
                  <FieldError errors={fieldErrors} field="student_id" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("Amount Paid")}</Label>
                      <Input required type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} />
                      <FieldError errors={fieldErrors} field="amount_paid" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Method")}</Label>
                      <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">{t("Cash")}</SelectItem>
                          <SelectItem value="bank">{t("Bank Transfer")}</SelectItem>
                          <SelectItem value="card">{t("Card")}</SelectItem>
                          <SelectItem value="mobile">{t("Mobile Money")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={fieldErrors} field="payment_method" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Remarks")}</Label>
                    <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">{t("Save Changes")}</Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t("Students")} <span className="text-muted-foreground font-normal">({t("add one or more kids — e.g. siblings")})</span></Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setSearchOpen(true);
                          setFieldErrors((err) => ({ ...err, students: undefined }));
                        }}
                        onFocus={() => setSearchOpen(true)}
                        onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                        placeholder={t("Search by name, student number, or guardian phone…")}
                        className="pl-9 pr-9"
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => { setStudentSearch(""); setSearchOpen(true); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {searchOpen && (
                        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-background shadow-lg">
                          {searching ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">{t("Searching…")}</p>
                          ) : studentSearch.trim() === "" ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">Type to search by name, number, or guardian phone</p>
                          ) : searchResults.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No students found</p>
                          ) : (
                            searchResults.map((s) => {
                              const added = bulkStudents.some((x) => x.user_id === s.user_id);
                              return (
                                <button
                                  type="button"
                                  key={s.user_id}
                                  onMouseDown={(e) => { e.preventDefault(); addBulkStudent(s); }}
                                  className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 ${added ? "opacity-60" : ""}`}
                                >
                                  <StudentAvatar student={s} className="w-7 h-7 text-xs" />
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium truncate">{s.first_name} {s.last_name}</span>
                                    <span className="block text-xs text-muted-foreground truncate">
                                      {[s.student_number, s.class_name, s.phone].filter(Boolean).join(" · ")}
                                    </span>
                                  </span>
                                  {added && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                    {bulkStudents.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {bulkStudents.map((s) => (
                          <span key={s.user_id} className="inline-flex items-center gap-2 rounded-full border bg-muted/50 pl-1 pr-2 py-1 text-sm">
                            <StudentAvatar student={s} className="w-6 h-6 text-[10px]" />
                            <span className="font-medium">{s.first_name} {s.last_name}</span>
                            <button type="button" onClick={() => removeBulkStudent(s.user_id)} className="text-muted-foreground hover:text-foreground" title="Remove">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <FieldError errors={fieldErrors} field="students" />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Fee Structures <span className="text-muted-foreground font-normal">(optional — select one or more)</span></Label>
                    {fees.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No fee structures defined</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                        {fees.map((f) => {
                          const active = bulkFeeIds.includes(f.id);
                          return (
                            <button
                              type="button"
                              key={f.id}
                              onClick={() => toggleFee(f.id)}
                              className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-1.5 transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {f.name} <span className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{parseFloat(f.amount || 0).toLocaleString()}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {bulkStudents.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Amounts</Label>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-2 font-medium">Student</th>
                              {bulkFeeIds.length === 0 ? (
                                <th className="text-left p-2 font-medium w-40">Amount</th>
                              ) : (
                                bulkFeeIds.map((fid) => {
                                  const f = fees.find((x) => x.id === fid);
                                  return (
                                    <th key={fid} className="text-left p-2 font-medium min-w-36">
                                      {f ? f.name : "Fee"}
                                      {f && <span className="block text-xs font-normal text-muted-foreground">{parseFloat(f.amount).toLocaleString()}</span>}
                                    </th>
                                  );
                                })
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {bulkStudents.map((s) => (
                              <tr key={s.user_id} className="border-b last:border-0">
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <StudentAvatar student={s} className="w-7 h-7 text-xs" />
                                    <div className="leading-tight">
                                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                                      <p className="text-xs text-muted-foreground">{[s.student_number, s.class_name].filter(Boolean).join(" · ")}</p>
                                    </div>
                                  </div>
                                </td>
                                {bulkFeeIds.length === 0 ? (
                                  <td className="p-2">
                                    <Input type="number" min="0" placeholder="0.00" value={bulkAmounts[gridKey(s.user_id, null)] || ""} onChange={(e) => setCellAmount(s.user_id, null, e.target.value)} />
                                  </td>
                                ) : (
                                  bulkFeeIds.map((fid) => (
                                    <td key={fid} className="p-2">
                                      <Input type="number" min="0" placeholder="0.00" value={bulkAmounts[gridKey(s.user_id, fid)] || ""} onChange={(e) => setCellAmount(s.user_id, fid, e.target.value)} />
                                    </td>
                                  ))
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <FieldError errors={fieldErrors} field="amounts" />
                    </div>
                  ) : (
                    <FieldError errors={fieldErrors} field="amounts" />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={bulkMethod} onValueChange={(v) => setBulkMethod(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="mobile">Mobile Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Remarks</Label>
                      <Input value={bulkRemarks} onChange={(e) => setBulkRemarks(e.target.value)} placeholder="e.g. Semester 1" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-sm text-muted-foreground">
                      {bulkStudents.length > 0 ? `${bulkPaymentsList.length} payment(s) · Total ` : "No payments yet"}
                      {bulkPaymentsList.length > 0 && <span className="font-bold text-foreground">{bulkTotal.toLocaleString()}</span>}
                    </p>
                    <Button type="submit" disabled={bulkPaymentsList.length === 0}>
                      {bulkPaymentsList.length > 0 ? `Save ${bulkPaymentsList.length} Payment${bulkPaymentsList.length > 1 ? "s" : ""}` : "Record Payments"}
                    </Button>
                  </div>
                </>
              )}
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t("Transactions")}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meta.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {summary.by_collector?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Collected By")}</CardTitle>
            {filterCollectorId && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { setFilterCollectorId(""); setPage(1); }}>
                <X className="h-3 w-3 mr-1" /> {t("Clear collector filter")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Collector")}</TableHead>
                  <TableHead>{t("Transactions")}</TableHead>
                  <TableHead>{t("Total")}</TableHead>
                  <TableHead>{t("Period")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.by_collector.map((c) => (
                  <TableRow
                    key={c.collected_by || "unassigned"}
                    className={filterCollectorId === c.collected_by ? "bg-muted cursor-pointer" : "cursor-pointer"}
                    onClick={() => { setFilterCollectorId(c.collected_by); setPage(1); }}
                  >
                    <TableCell className="font-medium">
                      {c.collector_name}
                      {filterCollectorId === c.collected_by && <span className="ml-2 text-xs text-muted-foreground">(filtered)</span>}
                    </TableCell>
                    <TableCell>{c.transaction_count}</TableCell>
                    <TableCell>{c.total.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.first_paid_date ? <><EthiopianDate date={c.first_paid_date} showGregorian={false} /> – <EthiopianDate date={c.last_paid_date} showGregorian={false} /></> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {ledger.structures?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Fee Statement")} — {ledger.student?.first_name} {ledger.student?.last_name} ({ledger.student?.student_number || "—"})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>{t("Payment History")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{new Date(0, i).toLocaleString("en", { month: "long" })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterFeeId} onValueChange={(v) => { setFilterFeeId(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Fee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fees</SelectItem>
                  {fees.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              {(filterStudentId || filterCollectorId || filterMonth || filterFeeId || filterStatus) && (
                <Button variant="outline" size="sm" onClick={() => {
                  setFilterStudentId(""); setFilterCollectorId(""); setFilterMonth("");
                  setFilterFeeId(""); setFilterStatus(""); setFilterSearch(""); setPage(1);
                }}>
                  <X className="h-3 w-3 mr-1" /> Clear filters
                </Button>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filterSearch}
                  onChange={(e) => { setFilterSearch(e.target.value); setFilterOpen(true); }}
                  onFocus={() => setFilterOpen(true)}
                  onBlur={() => setTimeout(() => setFilterOpen(false), 150)}
                  placeholder="Filter by student, number, or guardian phone…"
                  className="pl-9"
                />
                {filterOpen && filterSearch.trim() !== "" && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-background shadow-lg">
                    {searching ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                    ) : searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No students found</p>
                    ) : (
                      searchResults.map((s) => (
                        <button
                          type="button"
                          key={s.user_id}
                          onMouseDown={(e) => { e.preventDefault(); setFilterStudentId(s.user_id); setPage(1); setFilterSearch(`${s.first_name} ${s.last_name}`); setFilterOpen(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-muted flex flex-col gap-0.5"
                        >
                          <span className="text-sm font-medium">{s.first_name} {s.last_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[s.student_number, s.class_name, s.phone].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              {payments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">{t("No payments yet")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="p-3 font-medium">{t("Student")}</th>
                        <th className="p-3 font-medium">{t("Day")}</th>
                        <th className="p-3 font-medium">{t("Details")}</th>
                        <th className="p-3 font-medium">{t("Amount")}</th>
                        <th className="p-3 font-medium">{t("Status")}</th>
                        <th className="p-3 font-medium text-right">{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPayments.map((g) => {
                        const key = `${g.student_id}::${g.dateKey}`;
                        const day = g.dateKey ? <EthiopianDate date={g.dateKey} /> : "—";
                        const avatar = <StudentAvatar student={{ user_id: g.student_id, first_name: g.first_name, last_name: g.last_name }} className="w-8 h-8" />;
                        const caption = (p) => p.collector_first_name ? `${p.collector_first_name} ${p.collector_last_name}` : "—";

                        if (g.items.length === 1) {
                          const p = g.items[0];
                          return (
                            <tr key={`single-${key}`} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {avatar}
                                  <button className="font-medium hover:text-primary hover:underline text-left" onClick={() => navigate(`/students/${g.student_id}`)}>
                                    {g.first_name} {g.last_name}
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground">{day}</td>
                              <td className="p-3">
                                <p>{p.fee_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{caption(p)}</p>
                                {p.receipt_no && <p className="text-xs font-mono text-muted-foreground">#{p.receipt_no}</p>}
                              </td>
                              <td className="p-3">
                                <span className="font-medium">{parseFloat(p.amount_paid || 0).toLocaleString()}</span>
                                <span className="block text-xs text-muted-foreground capitalize">
                                  {p.payment_method}{p.paid_date ? ` · ${new Date(p.paid_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                                </span>
                              </td>
                              <td className="p-3"><Badge variant={p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "secondary"}>{p.status}</Badge></td>
                              <td className="p-3">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" title="Invoice" onClick={() => window.open(`/api/pdf/invoice/${p.student_id}`, "_blank")}><Download className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" title="Edit" onClick={() => startEdit(p)} disabled={p.status === "refunded"}><Pencil className="h-4 w-4" /></Button>
                                  {p.status !== "refunded"
                                    ? <Button variant="ghost" size="icon" title="Refund" onClick={() => handleRefund(p)}><RotateCcw className="h-4 w-4" /></Button>
                                    : <Button variant="ghost" size="icon" title="Delete" className="text-red-500" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>}
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        const isCollapsed = collapsed.has(key);
                        return (
                          <Fragment key={key}>
                            <tr className="border-b bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={() => toggleGroup(key)}>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                  {avatar}
                                  <button className="font-medium hover:text-primary hover:underline text-left" onClick={(e) => { e.stopPropagation(); navigate(`/students/${g.student_id}`); }}>
                                    {g.first_name} {g.last_name}
                                    <span className="block text-xs font-normal text-muted-foreground">{g.items.length} payments</span>
                                  </button>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground">{day}</td>
                              <td className="p-3 text-muted-foreground">Day total</td>
                              <td className="p-3 font-bold">{g.total.toLocaleString()}</td>
                              <td className="p-3" />
                              <td className="p-3" />
                            </tr>
                            {!isCollapsed &&
                              g.items.map((p) => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-3 pl-12">
                                    <p className="text-muted-foreground">{p.fee_name || "—"}</p>
                                    <p className="text-xs text-muted-foreground/70">{caption(p)}</p>
                                  </td>
                                  <td className="p-3" />
                                  <td className="p-3">
                                    <span className="capitalize">{p.payment_method}</span>
                                    {p.paid_date && <span className="block text-xs text-muted-foreground">{new Date(p.paid_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                  </td>
                                  <td className="p-3">{parseFloat(p.amount_paid || 0).toLocaleString()}</td>
                                  <td className="p-3"><Badge variant={p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "secondary"}>{p.status}</Badge></td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon" title="Invoice" onClick={() => window.open(`/api/pdf/invoice/${p.student_id}`, "_blank")}><Download className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="icon" title="Edit" onClick={() => startEdit(p)} disabled={p.status === "refunded"}><Pencil className="h-4 w-4" /></Button>
                                      {p.status !== "refunded"
                                        ? <Button variant="ghost" size="icon" title="Refund" onClick={() => handleRefund(p)}><RotateCcw className="h-4 w-4" /></Button>
                                        : <Button variant="ghost" size="icon" title="Delete" className="text-red-500" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
