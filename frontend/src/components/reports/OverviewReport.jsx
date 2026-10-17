import { BarChart, LineChart, DonutChart } from "../ui/charts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { StatCard, Progress, Insight } from "./ReportKit";
import { Users, CalendarCheck, DollarSign, AlertTriangle, GraduationCap, Briefcase, School } from "lucide-react";

const PALETTE = ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4", "#a0b2c6", "#e0a458"];

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function OverviewReport({ data }) {
  if (!data) return null;
  const k = data.kpis || {};
  const staffMax = Math.max(1, ...(data.staff_by_role || []).map((x) => x.value));
  const gradesSegments = (data.grade_distribution || []).map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
  const gradeTotal = (data.grade_distribution || []).reduce((s, x) => s + (Number(x.value) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={k.students?.label || "Students"} value={k.students?.value} icon={Users} />
        <StatCard label={k.attendance_rate?.label || "Attendance rate"} value={k.attendance_rate?.value} unit="%" delta={k.attendance_rate?.delta} icon={CalendarCheck} accent="#2c5a5e" />
        <StatCard label={k.collected?.label || "Fees collected"} value={k.collected?.value} unit="ETB" delta={k.collected?.delta} icon={DollarSign} accent="#2c5a5e" />
        <StatCard label={k.outstanding?.label || "Outstanding fees"} value={k.outstanding?.value} unit="ETB" icon={AlertTriangle} accent="#d47a6a" />
        <StatCard label={k.avg_score?.label || "Average score"} value={k.avg_score?.value} unit="%" delta={k.avg_score?.delta} icon={GraduationCap} />
        <StatCard label={k.staff?.label || "Staff"} value={k.staff?.value} icon={Briefcase} />
        <StatCard label={k.classes?.label || "Classes"} value={k.classes?.value} icon={School} />
      </div>

      {data.insights?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.insights.map((s, i) => <Insight key={i}>{s}</Insight>)}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Enrollment by grade"><BarChart data={data.enrollment_by_grade || []} /></Section>
        <Section title="Attendance rate by grade"><BarChart data={data.attendance_by_grade || []} color="#7fb3a0" /></Section>
        <Section title="Fee collection trend (ETB)"><LineChart data={data.collection_trend || []} /></Section>
        <Section title="Grade distribution">
          <DonutChart total={gradeTotal} segments={gradesSegments} caption="results" />
        </Section>
      </div>

      <Section title="Staff by role">
        <div className="space-y-3">
          {(data.staff_by_role || []).map((r, i) => (
            <Progress
              key={i}
              label={r.label}
              right={String(r.value)}
              value={(r.value / staffMax) * 100}
              color={PALETTE[i % PALETTE.length]}
            />
          ))}
          {!(data.staff_by_role || []).length && <p className="text-sm text-muted-foreground">No data</p>}
        </div>
      </Section>
    </div>
  );
}
