import { useState, Fragment } from "react";
import { useCollectionReport, useFeeStructures } from "../hooks/useFees";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function StatCard({ title, value, sub, color }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color || ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function statusBadge(status) {
  if (status === "paid") return <Badge variant="success">Paid</Badge>;
  if (status === "partial") return <Badge variant="warning">Partial</Badge>;
  if (status === "unpaid") return <Badge variant="secondary">Unpaid</Badge>;
  return <Badge variant="outline">N/A</Badge>;
}

export default function CollectionReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [feeId, setFeeId] = useState("");
  const [openClass, setOpenClass] = useState(null);

  const { data, isLoading } = useCollectionReport({
    month,
    year,
    ...(feeId ? { fee_structure_id: feeId } : {}),
  });
  const { data: feesData } = useFeeStructures({ limit: 200 });

  const report = data?.data;
  const fees = feesData?.data || [];
  const totals = report?.totals || {};

  function downloadCSV() {
    if (!report) return;
    const rows = [["Class", "Student Number", "First Name", "Last Name", "Guardian Phone", "Expected", "Paid", "Balance", "Status"]];
    for (const cls of report.classes) {
      for (const s of cls.students) {
        rows.push([cls.class_name, s.student_number, s.first_name, s.last_name, s.guardian_phone || "", s.expected, s.paid, s.balance, s.status]);
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-report-${report.month}-${report.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Collection Report</h1>
          <p className="text-muted-foreground">Collected and uncollected fees by class</p>
        </div>
        <Button variant="outline" disabled={!report} onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-2" /> Download CSV
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" className="w-28" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fee</Label>
              <Select value={feeId} onValueChange={(v) => setFeeId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All fees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fees</SelectItem>
                  {fees.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Students" value={totals.total_students || 0} />
        <StatCard title="Paid" value={totals.paid_count ?? 0} sub={`${((totals.paid_count || 0) / (totals.total_students || 1) * 100).toFixed(1)}% of students`} color="text-green-600" />
        <StatCard title="Partial" value={totals.partial_count || 0} />
        <StatCard title="Unpaid" value={totals.unpaid_count || 0} sub={`${((totals.unpaid_count || 0) / (totals.total_students || 1) * 100).toFixed(1)}% of students`} color="text-red-600" />
        <StatCard title="Collected" value={Number(totals.collected || 0).toLocaleString()} sub={`of ${Number(totals.expected || 0).toLocaleString()} expected`} color="text-green-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>By Class — {report?.fee_name || "Loading…"}</CardTitle>
            <span className="text-sm text-muted-foreground">{MONTHS[(report?.month || 1) - 1]} {report?.year || ""}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-muted-foreground">Loading...</p>
          ) : !report ? (
            <p className="p-4 text-muted-foreground">No data</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Partial</TableHead>
                    <TableHead>Unpaid</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.classes.map((c) => {
                    const open = openClass === c.class_id;
                    return (
                      <Fragment key={c.class_id}>
                        <TableRow key={c.class_id} className="cursor-pointer" onClick={() => setOpenClass(open ? null : c.class_id)}>
                          <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                          <TableCell className="font-medium">{c.class_name}</TableCell>
                          <TableCell>{c.student_count}</TableCell>
                          <TableCell className="text-green-600">{c.collected_count}</TableCell>
                          <TableCell className="text-yellow-600">{c.partial_count}</TableCell>
                          <TableCell className="text-red-600">{c.unpaid_count}</TableCell>
                          <TableCell className="text-right">{Number(c.expected).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(c.collected).toLocaleString()}</TableCell>
                        </TableRow>
                        {open && (
                          <TableRow key={`${c.class_id}-detail`}>
                            <TableCell colSpan={8}>
                              <div className="max-h-72 overflow-y-auto border rounded-md">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Student</TableHead>
                                      <TableHead>No.</TableHead>
                                      <TableHead>Phone</TableHead>
                                      <TableHead className="text-right">Expected</TableHead>
                                      <TableHead className="text-right">Paid</TableHead>
                                      <TableHead className="text-right">Balance</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {c.students.map((s) => (
                                      <TableRow key={s.user_id}>
                                        <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                                        <TableCell>{s.student_number}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{s.guardian_phone || "—"}</TableCell>
                                        <TableCell className="text-right">{Number(s.expected).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{Number(s.paid).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{Number(s.balance).toLocaleString()}</TableCell>
                                        <TableCell>{statusBadge(s.status)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}