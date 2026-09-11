import { useState } from "react";
import { useImportData } from "../hooks/useImport";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function ImportPage() {
  const { t } = useI18n();
  const [type, setType] = useState("students");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const importData = useImportData();

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
    setPreview(rows);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    const res = await importData.mutateAsync({ type, records: preview });
    setResult(res.data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Upload className="h-8 w-8" /> {t("Bulk Import")}</h1>
        <p className="text-muted-foreground">{t("Import students, teachers, or payments from CSV")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Import Data")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="w-48 space-y-2">
            <Label>{t("Type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="students">{t("Students")}</SelectItem>
                <SelectItem value="teachers">{t("Teachers")}</SelectItem>
                <SelectItem value="payments">{t("Payments")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("CSV Data")}</Label>
            <p className="text-xs text-muted-foreground">
              {type === "students" && t("Headers: email, first_name, last_name, class_name, student_number")}
              {type === "teachers" && t("Headers: email, first_name, last_name")}
              {type === "payments" && t("Headers: email, amount_paid, paid_date, payment_method")}
            </p>
            <textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); parseCSV(e.target.value); }}
              rows={8}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
              placeholder="email,first_name,last_name,class_name&#10;john@example.com,John,Doe,Grade 7A&#10;jane@example.com,Jane,Doe,Grade 8B"
            />
          </div>
          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("{count} records parsed", { count: preview.length })}</p>
              <div className="max-h-40 overflow-auto rounded border text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(preview[0]).map((h) => <th key={h} className="px-3 py-1 text-left text-xs font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-1 text-xs">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleImport} disabled={importData.isPending}>
                {importData.isPending ? t("Importing...") : t("Import {count} Records", { count: preview.length })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>{t("Import Results")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> {t("{count} created", { count: result.created })}</div>
              <div className="flex items-center gap-1 text-yellow-600"><XCircle className="h-4 w-4" /> {t("{count} skipped", { count: result.skipped })}</div>
            </div>
            {result.errors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">{t("Errors:")}</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{t("Row: {row} — {error}", { row: JSON.stringify(e.row), error: e.error })}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
