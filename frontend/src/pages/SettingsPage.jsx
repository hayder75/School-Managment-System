import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Save, Languages, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { lang, switchLang } = useI18n();
  const [form, setForm] = useState({});

  const settings = data?.data || {};

  useEffect(() => {
    if (Object.keys(settings).length > 0 && Object.keys(form).length === 0) {
      setForm({ ...settings });
    }
  }, [settings]);

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    await updateSettings.mutateAsync(form);
  }

  if (isLoading) return <p className="text-muted-foreground p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your school settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>School Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input value={form.school_name || ""} onChange={(e) => handleChange("school_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>School Email</Label>
                <Input value={form.school_email || ""} onChange={(e) => handleChange("school_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.school_phone || ""} onChange={(e) => handleChange("school_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.school_address || ""} onChange={(e) => handleChange("school_address", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={form.currency || "ETB"} onChange={(e) => handleChange("currency", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Week Start Day</Label>
                <Input value={form.week_start_day || "Monday"} onChange={(e) => handleChange("week_start_day", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Academic Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Academic Year</Label>
                <Input value={form.current_academic_year || ""} onChange={(e) => handleChange("current_academic_year", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Current Term</Label>
                <Input value={form.current_term || ""} onChange={(e) => handleChange("current_term", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Passing Grade (%)</Label>
                <Input type="number" value={form.passing_grade || "50"} onChange={(e) => handleChange("passing_grade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Subjects Per Term</Label>
                <Input type="number" value={form.max_subjects || "14"} onChange={(e) => handleChange("max_subjects", e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <TermsManager />
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Finance Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Late Fee (%)</Label>
                <Input type="number" value={form.default_late_fee_pct || "5"} onChange={(e) => handleChange("default_late_fee_pct", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default Payment Method</Label>
                <Input value={form.default_payment_method || "cash"} onChange={(e) => handleChange("default_payment_method", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Enable Partial Payments</Label>
                <Input value={form.enable_partial_payments || "true"} onChange={(e) => handleChange("enable_partial_payments", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading" className="space-y-4">
          <GradingSettings settings={settings} onSave={(kv) => updateSettings.mutateAsync(kv)} saving={updateSettings.isPending} />
        </TabsContent>
        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader><CardTitle><Languages className="h-5 w-5 inline mr-2" />Language Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Interface Language</Label>
                <div className="flex gap-4">
                  <Button
                    variant={lang === "en" ? "default" : "outline"}
                    onClick={() => switchLang("en")}
                    className="w-32"
                  >
                    English
                  </Button>
                  <Button
                    variant={lang === "am" ? "default" : "outline"}
                    onClick={() => switchLang("am")}
                    className="w-32"
                  >
                    አማርኛ
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Current language: <strong>{lang === "en" ? "English" : "አማርኛ"}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const DEFAULT_SCALE = [
  { letter: "A", min: 90, max: 100 },
  { letter: "B", min: 80, max: 89.99 },
  { letter: "C", min: 60, max: 79.99 },
  { letter: "D", min: 50, max: 59.99 },
  { letter: "F", min: 0, max: 49.99 },
];

function GradingSettings({ settings, onSave, saving }) {
  const parsedScale = (() => {
    try {
      const v = JSON.parse(settings["grading.scale"] || "null");
      return Array.isArray(v) && v.length ? v : DEFAULT_SCALE;
    } catch {
      return DEFAULT_SCALE;
    }
  })();
  const parsedWeights = (() => {
    try {
      const v = JSON.parse(settings["grading.weights"] || "null");
      if (v && v.ca_pct != null) return v;
    } catch {}
    return { ca_pct: 50, exam_pct: 50 };
  })();

  const [scale, setScale] = useState(parsedScale);
  const [weights, setWeights] = useState(parsedWeights);
  const [saved, setSaved] = useState(false);

  function updateBand(i, field, value) {
    setScale(scale.map((b, j) => (j === i ? { ...b, [field]: value === "" ? "" : Number(value) } : b)));
  }

  async function save() {
    const caPct = Number(weights.ca_pct) || 0;
    await onSave({
      "grading.scale": JSON.stringify(scale),
      "grading.weights": JSON.stringify({ ca_pct: caPct, exam_pct: Math.max(100 - caPct, 0) }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assessment Weights</CardTitle>
          <p className="text-sm text-muted-foreground">
            How semester marks are combined out of 100 — e.g. continuous assessment 50% + semester exam 50%.
          </p>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div>
            <Label>Continuous assessment %</Label>
            <Input type="number" min="0" max="100" className="w-36 mt-1" value={weights.ca_pct}
              onChange={(e) => setWeights({ ca_pct: e.target.value, exam_pct: Math.max(100 - Number(e.target.value || 0), 0) })} />
          </div>
          <span className="pb-2 text-muted-foreground">+</span>
          <div>
            <Label>Semester exam %</Label>
            <Input disabled className="w-36 mt-1" value={weights.exam_pct} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grade Scale (percentage out of 100)</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm max-w-lg">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2">Letter</th><th className="py-2">Min %</th><th className="py-2">Max %</th>
            </tr></thead>
            <tbody>
              {scale.map((band, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2"><Input value={band.letter} onChange={(e) => updateBand(i, "letter", e.target.value)} className="w-20" /></td>
                  <td className="py-1.5 pr-2"><Input type="number" value={band.min} onChange={(e) => updateBand(i, "min", e.target.value)} className="w-24" /></td>
                  <td className="py-1.5"><Input type="number" value={band.max} onChange={(e) => updateBand(i, "max", e.target.value)} className="w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />Save grading setup</Button>
            {saved && <span className="text-sm text-green-600">Saved ✓ applies to new semester results & report cards</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TermsManager() {
  const { data: yearsData } = useQuery({ queryKey: ["academic-years"], queryFn: async () => (await fetch("/api/academics/academic-years")).json() });
  const [terms, setTerms] = useState(null);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", academic_year_id: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const loadTerms = () => {
    fetch("/api/academics/terms").then((r) => r.json()).then((d) => setTerms(d.data || []));
  };
  useEffect(() => {
    loadTerms();
    fetch("/api/academics/academic-years").then((r) => r.json()).then((d) => {
      const list = d.data || [];
      setYears(list);
      if (list.length) {
        const current = list.find((y) => y.is_current) || list[0];
        setForm((f) => ({ ...f, academic_year_id: f.academic_year_id || current.id }));
      }
    });
  }, []);

  async function addTerm(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/academics/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message || "Failed");
      setForm({ name: "", start_date: "", end_date: "", academic_year_id: form.academic_year_id });
      loadTerms();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(term) {
    await fetch(`/api/academics/terms/${term.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: term.name, start_date: term.start_date?.slice(0, 10), end_date: term.end_date?.slice(0, 10) }),
    });
    setEditing(null);
    loadTerms();
  }

  async function removeTerm(term) {
    const res = await fetch(`/api/academics/terms/${term.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.success) alert(d.error?.message || "Cannot delete");
    loadTerms();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semesters / Terms</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create as many terms as your school uses — 2 for semesters, 3 for trimester, 4 for quarters. Report cards are generated per term.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {terms === null ? (
          <p className="text-sm text-muted-foreground">Loading terms…</p>
        ) : (
          <table className="w-full text-sm max-w-2xl">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2">Name</th><th className="py-2">Starts</th><th className="py-2">Ends</th><th className="py-2">Exams?</th><th></th>
            </tr></thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-1.5 pr-2">
                    {editing?.id === t.id
                      ? <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-36" />
                      : <span className="font-medium">{t.name}</span>}
                    {t.year_name && <div className="text-[11px] text-muted-foreground">{t.year_name}</div>}
                  </td>
                  <td className="py-1.5 pr-2">
                    {editing?.id === t.id
                      ? <Input type="date" value={editing.start_date?.slice(0, 10)} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} className="w-36" />
                      : String(t.start_date).slice(0, 10)}
                  </td>
                  <td className="py-1.5 pr-2">
                    {editing?.id === t.id
                      ? <Input type="date" value={editing.end_date?.slice(0, 10)} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} className="w-36" />
                      : String(t.end_date).slice(0, 10)}
                  </td>
                  <td className="py-1.5 text-xs text-muted-foreground">{t.has_exams != null ? t.has_exams : ""}</td>
                  <td className="py-1.5 text-right space-x-2 whitespace-nowrap">
                    {editing?.id === t.id ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(editing)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditing({ ...t })}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeTerm(t)}>Delete</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!terms.length && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No terms yet — add the first below.</td></tr>}
            </tbody>
          </table>
        )}

        <form onSubmit={addTerm} className="border-t pt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <Label>Academic year</Label>
            <select value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" required>
              <option value="">Select…</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " ★" : ""}</option>)}
            </select>
          </div>
          <div>
            <Label>Term name *</Label>
            <Input placeholder="Semester 1 / Q1…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div><Label>Starts *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
          <div><Label>Ends *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
          <div className="col-span-full flex justify-end">
            <Button type="submit"><Plus className="h-4 w-4 mr-2" />Add term</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
