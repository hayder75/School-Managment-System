import { useState } from "react";
import { useClasses } from "../hooks/useClasses";
import { useAdminAttendanceOverview, useAdminClassAttendance } from "../hooks/useAttendance";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, DonutChart, GroupedBarChart } from "../components/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { UserCheck, AlertTriangle, Clock, CheckCircle, CalendarDays, BarChart3, Users, GraduationCap, TrendingDown, Search, X } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_ORDER = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];
const PALETTE = ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4", "#a0b2c6", "#e0a458"];

function levelLabel(c) {
  if (c.level_group === "nursery") return "Nursery";
  if (c.level_group === "kg") return c.grade_level === 2 ? "UKG" : "LKG";
  return `Grade ${c.grade_level}`;
}

function StatCard({ title, value, icon: Icon, sub, color }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }) {
  const styles = {
    1: "bg-yellow-400 text-yellow-950",
    2: "bg-neutral-300 text-neutral-800",
    3: "bg-orange-300 text-orange-900",
  };
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${styles[rank] || "bg-neutral-100 text-neutral-500"}`}>
      {rank}
    </span>
  );
}

export default function AdminAttendancePage() {
  const today = new Date().toISOString().split("T")[0];
  const [draftFrom, setDraftFrom] = useState("2026-01-01");
  const [draftTo, setDraftTo] = useState(today);
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState(today);
  const [classId, setClassId] = useState("");
  const { data: classesData } = useClasses({ limit: 200 });

  const params = { from_date: fromDate, to_date: toDate };
  const overviewParams = classId ? { ...params, class_id: classId } : params;
  const { data: overviewData, isLoading } = useAdminAttendanceOverview(overviewParams);
  const { data: classData } = useAdminClassAttendance(classId, params);

  const overview = overviewData?.data || {};
  const summary = overview.summary || {};
  const byClass = overview.by_class || [];
  const trend = overview.trend || [];
  const topAbsent = overview.top_absent || [];
  const classDetail = classData?.data || null;
  const allClasses = classesData?.data || [];

  const levelAgg = {};
  for (const c of byClass) {
    const label = levelLabel(c);
    levelAgg[label] = (levelAgg[label] || 0) + c.absent;
  }
  const levelBars = LEVEL_ORDER.filter((l) => levelAgg[l] != null).map((l) => ({ label: l, value: levelAgg[l] }));

  const monthAgg = {};
  for (const d of trend) {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (!monthAgg[m]) monthAgg[m] = { present: 0, absent: 0, late: 0 };
    monthAgg[m].present += d.present;
    monthAgg[m].absent += d.absent;
    monthAgg[m].late += d.late;
  }
  const trendBars = Object.keys(monthAgg)
    .sort((a, b) => Number(a) - Number(b))
    .map((m) => ({ label: MONTHS[Number(m)], present: monthAgg[m].present, absent: monthAgg[m].absent }));

  const statusSegments = [
    { label: "Present", value: summary.present || 0, color: "#2c5a5e" },
    { label: "Absent", value: summary.absent || 0, color: "#d47a6a" },
    { label: "Late", value: summary.late || 0, color: "#c9a86a" },
    { label: "Excused", value: summary.excused || 0, color: "#8f9bb3" },
  ];

  function applyFilters() {
    setFromDate(draftFrom);
    setToDate(draftTo);
  }

  function selectClass(id) {
    setClassId(id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Analytics</h1>
        <p className="text-muted-foreground">School-wide attendance overview, absence hotspots and student-level breakdown</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={classId || "__all__"} onValueChange={(v) => selectClass(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All classes</SelectItem>
                  {allClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyFilters} className="gap-2"><Search className="h-4 w-4" /> Apply</Button>
            {classId && (
              <Button variant="outline" onClick={() => selectClass("")} className="gap-2"><X className="h-4 w-4" /> Clear class</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading attendance analytics...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Attendance Rate" value={summary.present_rate != null ? `${summary.present_rate}%` : "—"} icon={UserCheck} color="text-green-600" sub={`${summary.present || 0} present`} />
            <StatCard title="Absent" value={summary.absent || "—"} icon={AlertTriangle} color="text-red-600" sub={`${summary.absent_rate}% absent rate`} />
            <StatCard title="Late" value={summary.late || "—"} icon={Clock} color="text-yellow-600" sub={`${summary.late_rate}% late rate`} />
            <StatCard title="Excused" value={summary.excused || "—"} icon={CheckCircle} color="text-blue-600" sub={`${summary.excused_rate}% excused rate`} />
            <StatCard title="Total Records" value={summary.total?.toLocaleString() || "—"} icon={CalendarDays} color="text-neutral-600" sub={`${byClass.length} classes tracked`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Attendance Status Mix</CardTitle></CardHeader>
              <CardContent><DonutChart total={summary.students || 0} segments={statusSegments} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Monthly Present vs Absent</span>
                  <span className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#2c5a5e" }} /> Present</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#d47a6a" }} /> Absent</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GroupedBarChart data={trendBars} series={[{ key: "present", label: "Present", color: "#2c5a5e" }, { key: "absent", label: "Absent", color: "#d47a6a" }]} height={200} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Absence by Level</CardTitle></CardHeader>
              <CardContent><BarChart data={levelBars} height={200} color="#d47a6a" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Most Absent Students</CardTitle></CardHeader>
              <CardContent>
                {topAbsent.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No attendance records in this range</p>
                ) : (
                  <div className="space-y-2">
                    {topAbsent.map((s, i) => (
                      <div key={s.student_id} className="flex items-center gap-3 p-2 border rounded">
                        <RankBadge rank={i + 1} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.class_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">{s.absent} absent</p>
                          <p className="text-xs text-muted-foreground">{s.absent_rate}% · {s.late} late</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Absence by Class (highest first)</CardTitle></CardHeader>
            <CardContent>
              {byClass.length === 0 ? (
                <p className="text-muted-foreground text-sm">No attendance records in this range</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Absent %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClass.map((c, i) => (
                      <TableRow key={c.class_id} className="cursor-pointer hover:bg-neutral-50" onClick={() => selectClass(c.class_id)}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{c.class_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{levelLabel(c)}</TableCell>
                        <TableCell className="text-right">{c.total}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{c.absent}</TableCell>
                        <TableCell className="text-right">{c.late}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.absent_rate >= 10 ? "bg-red-100 text-red-700" : c.absent_rate >= 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {c.absent_rate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {classDetail && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {classDetail.class.name} — Student Breakdown</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => selectClass("")} className="gap-1"><X className="h-3 w-3" /> Clear</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    <p className="text-lg font-bold text-green-600">{classDetail.summary.present_rate}%</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-lg font-bold text-red-600">{classDetail.summary.absent} ({classDetail.summary.absent_rate}%)</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="text-lg font-bold text-yellow-600">{classDetail.summary.late} ({classDetail.summary.late_rate}%)</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Records</p>
                    <p className="text-lg font-bold">{classDetail.summary.total?.toLocaleString()}</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Excused</TableHead>
                      <TableHead className="text-right">Absent %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classDetail.students.map((s) => (
                      <TableRow key={s.student_id}>
                        <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                        <TableCell className="text-right text-green-700">{s.present}</TableCell>
                        <TableCell className="text-right text-red-600">{s.absent}</TableCell>
                        <TableCell className="text-right text-yellow-600">{s.late}</TableCell>
                        <TableCell className="text-right">{s.excused}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.absent_rate >= 10 ? "bg-red-100 text-red-700" : s.absent_rate >= 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {s.absent_rate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
