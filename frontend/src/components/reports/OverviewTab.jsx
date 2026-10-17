import { useState } from "react";
import { useOverview } from "../../hooks/useReporting";
import OverviewReport from "./OverviewReport";
import ShareDialog from "./ShareDialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Download, FileText, Share2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function toCsv(payload) {
  const rows = [];
  const k = payload.kpis || {};
  rows.push(["KPI", "Value", "Unit"]);
  for (const [key, v] of Object.entries(k)) rows.push([v?.label || key, v?.value ?? "", v?.unit || ""]);
  const section = (title, arr, cols) => {
    if (!arr?.length) return;
    rows.push([]);
    rows.push([title]);
    rows.push(cols);
    for (const r of arr) rows.push(cols.map((c) => r[c] ?? ""));
  };
  section("Enrollment by grade", payload.enrollment_by_grade, ["label", "value"]);
  section("Attendance by grade (%)", payload.attendance_by_grade, ["label", "value"]);
  section("Collection trend", payload.collection_trend, ["label", "value"]);
  section("Grade distribution", payload.grade_distribution, ["label", "value"]);
  section("Staff by role", payload.staff_by_role, ["label", "value"]);
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function OverviewTab({ canShare = true }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [shareOpen, setShareOpen] = useState(false);
  const { data, isLoading, isError } = useOverview({ from, to });
  const payload = data?.data;

  function exportCsv() {
    if (!payload) return;
    const blob = new Blob([toCsv(payload)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `school-overview_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("From")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("To")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={exportCsv} disabled={!payload}><FileText className="h-4 w-4 mr-1" />{t("CSV")}</Button>
        <Button variant="outline" onClick={() => window.open(`/api/pdf/report-overview?from=${from}&to=${to}`, "_blank")}>
          <Download className="h-4 w-4 mr-1" />{t("PDF")}
        </Button>
        {canShare && (
          <Button onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4 mr-1" />{t("Share")}</Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-10 text-center">{t("Loading...")}</p>
      ) : isError ? (
        <p className="text-destructive py-10 text-center">{t("Failed to load report")}</p>
      ) : (
        <OverviewReport data={payload} />
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reportId="overview"
        title={t("School Overview")}
        filters={{ from, to }}
      />
    </div>
  );
}
