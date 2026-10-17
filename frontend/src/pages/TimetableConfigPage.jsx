import { useState, useEffect } from "react";
import api from "../lib/api";
import { useSubjects } from "../hooks/useSubjects";
import { useClasses } from "../hooks/useClasses";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useI18n } from "../i18n/I18nContext";
import { Wand2, Save, Clock, CalendarDays } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABEL = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat" };

function computeSlots(startTime, minutes, count) {
  const [h, m] = String(startTime || "08:00").split(":").map(Number);
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const out = [];
  let cur = (h || 8) * 60 + (m || 0);
  for (let i = 0; i < count; i++) {
    out.push({ start: fmt(cur), end: fmt(cur + minutes) });
    cur += minutes + 5;
  }
  return out;
}

export default function TimetableConfigPage() {
  const { t } = useI18n();
  const { data: subjectsData } = useSubjects({ limit: 300 });
  const { data: classesData } = useClasses({ limit: 300 });
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genClassId, setGenClassId] = useState("__all__");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const subjects = subjectsData?.data || [];
  const classes = classesData?.data || [];

  useEffect(() => {
    api.get("/operations/timetable/config").then((res) => setConfig(res.data)).catch(() => {});
  }, []);

  function set(key, value) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function toggleDay(day) {
    const has = config.days.includes(day);
    set("days", has ? config.days.filter((d) => d !== day) : [...config.days, day]);
  }

  function setSubjectPeriod(subjectId, value) {
    const next = { ...(config.subject_periods || {}) };
    if (value === "") delete next[subjectId];
    else next[subjectId] = Number(value);
    set("subject_periods", next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put("/operations/timetable/config", config);
      setConfig(res.data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setResult(null);
    try {
      const payload = genClassId && genClassId !== "__all__" ? { class_id: genClassId } : {};
      const res = await api.post("/operations/timetable/generate", payload);
      setResult(res.data);
    } finally {
      setGenerating(false);
    }
  }

  if (!config) return <p className="text-muted-foreground">{t("Loading...")}</p>;

  const preview = computeSlots(config.start_time, config.period_minutes, config.periods_per_day);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("Timetable Auto-Setup")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("Configure how the system auto-builds timetables, then generate for a class or the whole school.")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? t("Saving...") : saved ? t("Saved") : t("Save Configuration")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {t("Working Days")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={config.days.includes(d)} onChange={() => toggleDay(d)} />
                  {t(DAY_LABEL[d])}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> {t("Periods & Time")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("Periods / day")}</Label>
                <Input type="number" min="1" max="12" value={config.periods_per_day} onChange={(e) => set("periods_per_day", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("Start time")}</Label>
                <Input type="time" value={config.start_time} onChange={(e) => set("start_time", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("Minutes / period")}</Label>
                <Input type="number" min="20" value={config.period_minutes} onChange={(e) => set("period_minutes", Number(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              {preview.map((s, i) => (
                <span key={i} className="px-2 py-1 rounded bg-muted">{i + 1}. {s.start}-{s.end}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Subject Periods per Week")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("Default periods per subject")}</Label>
              <Input
                type="number"
                min="0"
                className="w-32"
                value={config.default_periods_per_subject}
                onChange={(e) => set("default_periods_per_subject", Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              {t("Override individual subjects below. Leave blank to use the default.")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 border rounded-md px-3 py-1.5">
                <span className="text-sm truncate">{s.name}</span>
                <Input
                  type="number"
                  min="0"
                  className="w-16 h-8"
                  value={config.subject_periods?.[s.id] ?? ""}
                  placeholder={String(config.default_periods_per_subject)}
                  onChange={(e) => setSubjectPeriod(s.id, e.target.value)}
                />
              </div>
            ))}
            {subjects.length === 0 && <p className="text-sm text-muted-foreground">{t("No subjects")}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("Constraints")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("Max periods per teacher / day")}</Label>
              <Input type="number" min="1" className="w-32" value={config.max_periods_per_teacher_per_day} onChange={(e) => set("max_periods_per_teacher_per_day", Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.avoid_same_subject_same_day} onChange={(e) => set("avoid_same_subject_same_day", e.target.checked)} />
            {t("Avoid the same subject twice in one day")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.replace_existing} onChange={(e) => set("replace_existing", e.target.checked)} />
            {t("Replace existing timetable when generating")}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wand2 className="h-4 w-4" /> {t("Generate Timetable")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Class")}</Label>
              <Select value={genClassId} onValueChange={setGenClassId}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("All classes")}</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generating || !config.days.length} className="gap-2">
              <Wand2 className="h-4 w-4" /> {generating ? t("Generating...") : t("Generate")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("Save your configuration first, then generate.")}</p>
          {result && (
            <p className="text-sm text-emerald-700">{t("Generated")} {result.generated} {t("periods for")} {result.classes} {t("classes")}.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
