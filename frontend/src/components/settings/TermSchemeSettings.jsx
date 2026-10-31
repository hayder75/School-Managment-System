import { useEffect, useMemo, useState } from "react";
import { useAssessmentTypes, useGradingScheme, useUpdateGradingScheme } from "../../hooks/useExams";
import { useReviewerSettings, useUpdateReviewerSettings } from "../../hooks/useResults";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { classes as sev } from "../../lib/gradeColors";
import { CheckCircle2, AlertTriangle, Save, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export function TermSchemeSettings() {
  const { t } = useI18n();
  const { data, isLoading } = useGradingScheme();
  const { data: typeData } = useAssessmentTypes();
  const save = useUpdateGradingScheme();

  const types = typeData?.data || [];
  const [mode, setMode] = useState("raw");
  const [weights, setWeights] = useState({});
  const [passPct, setPassPct] = useState(50);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const scheme = data?.data?.scheme;
    if (!scheme) return;
    setMode(scheme.mode || "raw");
    setPassPct(scheme.pass_pct ?? 50);
    setWeights(Object.fromEntries((scheme.components || []).map((c) => [c.type_code, c.weight_pct])));
  }, [data]);

  const total = useMemo(
    () => Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0),
    [weights]
  );
  const totalOk = Math.abs(total - 100) < 0.01;

  async function handleSave() {
    setSaved(false);
    await save.mutateAsync({
      mode,
      pass_pct: Number(passPct),
      components: mode === "weighted"
        ? Object.entries(weights)
          .filter(([, w]) => Number(w) > 0)
          .map(([type_code, weight_pct]) => ({ type_code, weight_pct: Number(weight_pct) }))
        : [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Term mark scheme")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("How raw exam marks become a term mark out of 100. Use weighted components when midterms/finals are out of 50 and quizzes out of 10.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { v: "raw", label: t("Simple (raw totals)"), note: t("All exams for a subject must add up to 100.") },
            { v: "weighted", label: t("Weighted components"), note: t("Each type contributes a %; raw totals can be anything.") },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMode(o.v)}
              className={`rounded-lg border p-3 text-left transition-colors ${mode === o.v ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <div className="font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.note}</div>
            </button>
          ))}
        </div>

        {mode === "weighted" && (
          <>
            <div className="divide-y rounded-md border">
              <div className="grid grid-cols-[1fr_120px] gap-2 bg-muted/40 p-2 text-xs font-medium text-muted-foreground">
                <span>{t("Assessment type")}</span>
                <span className="text-right">{t("Weight %")}</span>
              </div>
              {types.map((ty) => (
                <div key={ty.code} className="grid grid-cols-[1fr_120px] items-center gap-2 p-2">
                  <span className="text-sm">
                    {ty.name}
                    {ty.default_total_marks != null && <span className="text-xs text-muted-foreground"> · /{Number(ty.default_total_marks)}</span>}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="h-8 text-right"
                    value={weights[ty.code] ?? ""}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value;
                      setWeights((prev) => {
                        const next = { ...prev };
                        if (v === "") delete next[ty.code];
                        else next[ty.code] = Number(v);
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between rounded-md border p-2 text-sm ${totalOk ? `${sev("good").bg} ${sev("good").border} ${sev("good").text}` : `${sev("danger").bg} ${sev("danger").border} ${sev("danger").text}`}`}>
              <span>{t("Total weight")}</span>
              <span className="font-bold">{total}% {totalOk ? `· ${t("ready")}` : `· ${t("must equal 100")}`}</span>
            </div>
          </>
        )}

        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">{t("Pass mark %")}</Label>
            <Input type="number" min="0" max="100" className="mt-1 w-32" value={passPct} onChange={(e) => setPassPct(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={save.isPending || (mode === "weighted" && !totalOk)}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? t("Saving...") : t("Save scheme")}
          </Button>
          {saved && <span className={`text-sm ${sev("good").text}`}><CheckCircle2 className="inline h-4 w-4 mr-1" />{t("Saved")}</span>}
          {save.isError && <span className={`text-sm ${sev("danger").text}`}><AlertTriangle className="inline h-4 w-4 mr-1" />{save.error?.response?.data?.error?.message || t("Could not save")}</span>}
        </div>

        {mode === "raw" && (
          <p className="text-xs text-muted-foreground">
            {t("Marks are shown as entered. A subject cannot exceed 100 across its exams.")}
          </p>
        )}
        {mode === "weighted" && (
          <p className="text-xs text-muted-foreground">
            {t("Example: Quiz 10 + Test 20 + Project 10 + Classwork 10 + Midterm 20 + Final 30 = 100. Within each type, marks are averaged as a percentage first.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ApprovalRulesSettings() {
  const { t } = useI18n();
  const { data } = useReviewerSettings();
  const save = useUpdateReviewerSettings();
  const [roles, setRoles] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.data?.roles) setRoles(data.data.roles);
  }, [data]);

  const options = [
    { key: "quality_director", label: t("Quality director (default)") },
    { key: "principal", label: t("Principal") },
    { key: "vice_principal", label: t("Vice principal") },
    { key: "general_manager", label: t("General manager") },
  ];

  function toggle(key) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function handleSave() {
    setSaved(false);
    await save.mutateAsync(roles);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><ShieldCheck className="inline h-5 w-5 mr-2" />{t("Result approvers")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("Who approves the marks teachers submit. The owner and admin can always override.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roles.includes(o.key)}
                onChange={() => toggle(o.key)}
              />
              {o.label}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={save.isPending || roles.length === 0}>
            <Save className="h-4 w-4 mr-1" /> {t("Save approvers")}
          </Button>
          {saved && <span className={`text-sm ${sev("good").text}`}>{t("Saved")}</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("Mark edit requests always need one owner/admin approval and one QA approval.")}
        </p>
      </CardContent>
    </Card>
  );
}
