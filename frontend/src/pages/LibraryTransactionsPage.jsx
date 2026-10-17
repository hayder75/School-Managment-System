import { useMemo, useState } from "react";
import { useBorrowings } from "../hooks/useLibrary";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Download } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

function statusBadge(b) {
  if (b.status === "returned") return <Badge variant="secondary">{b.returned_condition ? `${b.status} (${b.returned_condition})` : b.status}</Badge>;
  if (b.days_left != null && b.days_left < 0) return <Badge variant="destructive">Overdue {Math.abs(b.days_left)}d</Badge>;
  if (b.days_left === 0) return <Badge variant="warning">Due today</Badge>;
  return <Badge variant="success">{b.days_left} days left</Badge>;
}

function d(v) { return v ? String(v).slice(0, 10) : "—"; }

export default function LibraryTransactionsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading } = useBorrowings({ status, search: search || undefined, from: from || undefined, to: to || undefined });
  const rows = data?.data || [];

  const summary = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === "borrowed").length,
    returned: rows.filter((r) => r.status === "returned").length,
    overdue: rows.filter((r) => r.status === "borrowed" && r.days_left < 0).length,
    fines: rows.reduce((s, r) => s + (Number(r.fine_amount) || 0), 0),
  }), [rows]);

  function exportCsv() {
    const cols = ["Book", "ISBN", "Student", "Student ID", "Class", "Issued", "Issued by", "Due", "Returned", "Condition", "Fine", "Status", "Remarks"];
    const lines = [cols.join(",")];
    for (const r of rows) {
      lines.push([
        r.book_title, r.isbn, r.student_name, r.student_number, r.class_name,
        d(r.borrow_date), r.issued_by_name, d(r.due_date), d(r.return_date),
        r.returned_condition, r.fine_amount, r.status, r.remarks,
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `library-transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("Library Transactions")}</h1>
          <p className="text-muted-foreground">{t("Every issue and return, with condition and fines")}</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />{t("Export CSV")}</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Transactions")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("On loan")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.active}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Returned")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{summary.returned}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Overdue")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{summary.overdue}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Fines")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.fines.toLocaleString()} ETB</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("Search book, student, ID, ISBN…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All")}</SelectItem>
            <SelectItem value="borrowed">{t("On loan")}</SelectItem>
            <SelectItem value="overdue">{t("Overdue")}</SelectItem>
            <SelectItem value="returned">{t("Returned")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1"><span className="text-xs text-muted-foreground">{t("From")}</span><Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><span className="text-xs text-muted-foreground">{t("To")}</span><Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Book")}</TableHead>
                <TableHead>{t("Student")}</TableHead>
                <TableHead>{t("Class")}</TableHead>
                <TableHead>{t("Issued")}</TableHead>
                <TableHead>{t("Issued by")}</TableHead>
                <TableHead>{t("Due")}</TableHead>
                <TableHead>{t("Returned")}</TableHead>
                <TableHead>{t("Condition")}</TableHead>
                <TableHead className="text-right">{t("Fine")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.book_title}</p>
                    <p className="text-xs text-muted-foreground">{[r.author, r.isbn].filter(Boolean).join(" · ")}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{r.student_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.student_number || ""}</p>
                  </TableCell>
                  <TableCell>{r.class_name || "—"}</TableCell>
                  <TableCell>{d(r.borrow_date)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.issued_by_name || "—"}</TableCell>
                  <TableCell>{d(r.due_date)}</TableCell>
                  <TableCell>{d(r.return_date)}</TableCell>
                  <TableCell>{r.returned_condition || "—"}</TableCell>
                  <TableCell className="text-right">{Number(r.fine_amount) > 0 ? Number(r.fine_amount).toLocaleString() : "—"}</TableCell>
                  <TableCell>{statusBadge(r)}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground p-6">{t("No transactions yet")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
