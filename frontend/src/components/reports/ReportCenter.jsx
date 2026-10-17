import { useState, useEffect, useMemo } from "react";
import { useReportCatalog, useReport, useMyReportShares, useRevokeReportShare } from "../../hooks/useReporting";
import ReportRenderer from "./ReportRenderer";
import DetailTables from "./DetailTables";
import ShareDialog from "./ShareDialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Download, FileText, FileSpreadsheet, Share2, Link2, Trash2, Printer } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function toCsv(data) {
  const rows = [];
  rows.push(["Report", data.title || "", "Period", `${data.period?.from || ""} - ${data.period?.to || ""}`]);
  rows.push([]);
  rows.push(["Metric", "Value", "Unit", "Delta %"]);
  for (const v of Object.values(data.kpis || {})) rows.push([v.label || "", v.value ?? "", v.unit || "", v.delta ?? ""]);
  for (const sec of data.sections || []) {
    if (!sec.data?.length) continue;
    rows.push([]);
    rows.push([sec.title || ""]);
    rows.push(["Label", "Value"]);
    for (const r of sec.data) rows.push([r.label ?? "", r.value ?? ""]);
  }
  if (data.insights?.length) {
    rows.push([]);
    rows.push(["Insights"]);
    for (const s of data.insights) rows.push([s]);
  }
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function ReportCenter() {
  const { t } = useI18n();
  const { data: catData } = useReportCatalog();
  const catalog = catData?.data || [];
  const [selected, setSelected] = useState(null);
  const [from, setFrom] = useState(isoDaysAgo(89));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [shareOpen, setShareOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  useEffect(() => {
    if (!selected && catalog.length) setSelected(catalog[0].id);
  }, [catalog, selected]);

  const report = useReport(selected, from || to ? { from, to } : {});
  const payload = report.data?.data;

  const grouped = useMemo(() => {
    const g = {};
    for (const c of catalog) (g[c.category] ||= []).push(c);
    return g;
  }, [catalog]);

  function exportCsv() {
    if (!payload) return;
    const blob = new Blob([toCsv(payload)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected}_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!catalog.length) {
    return <p className="text-muted-foreground py-10 text-center">{t("No reports are available for your role.")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Report picker */}
      <div className="no-print space-y-3">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground w-24">{t(category)}</span>
            {items.map((c) => (
              <Button
                key={c.id}
                variant={selected === c.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelected(c.id)}
              >
                {t(c.title)}
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="no-print flex flex-wrap items-end gap-3 border-t pt-4">
        <div className="space-y-1">
          <Label className="text-xs">{t("From")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("To")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onClick={() => setLinksOpen(true)}><Link2 className="h-4 w-4 mr-1" />{t("Shared links")}</Button>
        <Button variant="outline" onClick={exportCsv} disabled={!payload}><FileText className="h-4 w-4 mr-1" />{t("CSV")}</Button>
        <Button variant="outline" onClick={() => window.open(`/api/reports/export/${selected}?from=${from}&to=${to}`, "_blank")} disabled={!payload}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />{t("Excel")}
        </Button>
        <Button variant="outline" onClick={() => window.print()} disabled={!payload}><Printer className="h-4 w-4 mr-1" />{t("Print")}</Button>
        <Button variant="outline" onClick={() => window.open(`/api/pdf/report/${selected}?from=${from}&to=${to}`, "_blank")}>
          <Download className="h-4 w-4 mr-1" />{t("PDF")}
        </Button>
        <Button onClick={() => setShareOpen(true)} disabled={!payload}><Share2 className="h-4 w-4 mr-1" />{t("Share")}</Button>
      </div>

      {report.isLoading ? (
        <p className="text-muted-foreground py-10 text-center">{t("Loading...")}</p>
      ) : report.isError ? (
        <p className="text-destructive py-10 text-center">{t("Failed to load report")}</p>
      ) : (
        <>
          <h2 className="report-print-title text-xl font-bold">{payload?.title}</h2>
          <ReportRenderer data={payload} />
          <DetailTables reportId={selected} filters={{ from, to }} />
        </>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        reportId={selected}
        title={payload?.title || selected}
        filters={{ from, to }}
      />

      <SharedLinksDialog open={linksOpen} onOpenChange={setLinksOpen} />
    </div>
  );
}

function SharedLinksDialog({ open, onOpenChange }) {
  const { t } = useI18n();
  const { data, isLoading } = useMyReportShares({ enabled: open });
  const revoke = useRevokeReportShare();
  const shares = data?.data || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("Shared links")}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No shared links yet")}</p>
        ) : (
          <div className="space-y-2">
            {shares.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.include_names ? t("With names") : t("Aggregates only")} ·{" "}
                      {s.expires_at ? `${t("expires")} ${String(s.expires_at).slice(0, 10)}` : t("no expiry")} ·{" "}
                      {s.views} {t("views")} {s.revoked ? `· ${t("revoked")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title={t("Copy")} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/r/${s.token}`)}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                    {!s.revoked && (
                      <Button variant="ghost" size="icon" title={t("Revoke")} onClick={() => revoke.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
