import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebounce";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Search, FileUp, Trash2, PartyPopper, KeyRound, CreditCard, UserCheck } from "lucide-react";

const STEPS = ["Student", "Class", "Guardian", "Medical & Docs", "Review"];
const RELATIONSHIPS = ["father", "mother", "guardian", "brother", "sister", "grandfather", "grandmother", "uncle", "aunt", "other"];
const EDU_LEVELS = ["None", "Primary", "Secondary", "Diploma", "Degree", "Masters", "PhD"];

const WIZARD_STORAGE_KEY = "sms.enrollWizard.v1";
const DEFAULT_STUDENT = {
  first_name: "", last_name: "", father_name: "", grandfather_name: "",
  gender: "", date_of_birth: "", nationality: "Ethiopian",
  country_of_birth: "", region_of_birth: "", zone_of_birth: "", woreda_of_birth: "", kebele_of_birth: "",
  region_of_residence: "", zone_of_residence: "", woreda_of_residence: "", kebele: "", home_address: "", location_type: "urban",
  previous_school: "", admission_type: "new",
  disability: false, disability_type: "", economic_status: "",
  parent_status: "", family_head_gender: "", national_id: "", emergency_contact: "",
};
const DEFAULT_NGFORM = { first_name: "", last_name: "", phone: "", relationship: "father", education_level: "", is_primary: false };

function loadWizardState() {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function EnrollmentWizardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const saved = useMemo(() => loadWizardState(), []);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [enrolledStudent, setEnrolledStudent] = useState(saved?.enrolledStudent ?? null);

  const [student, setStudent] = useState({ ...DEFAULT_STUDENT, ...(saved?.student || {}) });
  const [classId, setClassId] = useState(saved?.classId ?? "");
  const [guardians, setGuardians] = useState(saved?.guardians ?? []);
  const [newGuardians, setNewGuardians] = useState(saved?.newGuardians ?? []);
  const [ngForm, setNgForm] = useState({ ...DEFAULT_NGFORM, ...(saved?.ngForm || {}) });
  const [medicalInfo, setMedicalInfo] = useState(saved?.medicalInfo ?? {});
  const [docs, setDocs] = useState(saved?.docs ?? []);

  // Keep the in-progress enrollment across refreshes. If attachments are too
  // large for localStorage, retry without them so the rest is still saved.
  useEffect(() => {
    const payload = { step, student, classId, guardians, newGuardians, ngForm, medicalInfo, enrolledStudent, docs };
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      try { localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ ...payload, docs: [] })); } catch { /* ignore */ }
    }
  }, [step, student, classId, guardians, newGuardians, ngForm, medicalInfo, enrolledStudent, docs]);

  function resetWizard() {
    try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch { /* ignore */ }
    setEnrolledStudent(null);
    setStep(0);
    setStudent({ ...DEFAULT_STUDENT });
    setClassId("");
    setGuardians([]);
    setNewGuardians([]);
    setNgForm({ ...DEFAULT_NGFORM });
    setMedicalInfo({});
    setDocs([]);
    setError("");
  }

  const { data: classesData } = useQuery({ queryKey: ["classes-enroll"], queryFn: () => api.get("/classes?limit=300") });
  const classes = (classesData?.data || []);
  const selectedClass = classes.find((c) => c.id === classId);

  // Student counts per class — from /reports/enrollment which returns { by_class: [...] }
  const { data: classCounts } = useQuery({ queryKey: ["class-counts"], queryFn: async () => {
    const res = await api.get("/reports/enrollment");
    const map = {};
    (res?.data?.by_class || []).forEach((c) => { map[c.id] = Number(c.student_count || 0); });
    return map;
  }});

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }
  async function handleDocUpload(e) {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) continue;
      const dataUrl = await fileToDataUrl(f);
      setDocs((d) => [...d, { name: f.name, dataUrl }]);
    }
    e.target.value = "";
  }
  function addNewGuardian() {
    if (!ngForm.first_name || !ngForm.last_name || ngForm.phone.length < 7) return;
    setNewGuardians((g) => [...g, {
      ...ngForm,
      is_primary: newGuardians.length === 0 && guardians.length === 0,
    }]);
    setNgForm({ first_name: "", last_name: "", phone: "", relationship: "mother", education_level: "", is_primary: false });
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...student, class_id: classId, enrollment_date: new Date().toISOString().slice(0,10), status: "active", medical_info: Object.keys(medicalInfo).length ? medicalInfo : undefined, new_guardians: newGuardians, guardians: guardians.map((g) => ({ parent_id: g.parent_id, relationship: g.relationship, is_primary: g.is_primary, education_level: g.education_level })) };
      const r = await api.post("/students/enroll", payload);
      const data = r.data || r;
      for (const doc of docs) { await api.post(`/students/${data.id}/documents`, { type: "other", name: doc.name, file_url: doc.dataUrl }).catch(() => {}); }
      setEnrolledStudent(data);
    } catch (err) { setError(err?.error?.message || err?.message || "Enrollment failed"); return;
    } finally { setSaving(false); }
  }

  const creds = enrolledStudent?.__credentials || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!enrolledStudent ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div><h1 className="text-3xl font-bold">{t("Enroll New Student")}</h1><p className="text-muted-foreground">{t("Register the student, assign a class and add guardians in one flow")}</p></div>
            {(step > 0 || student.first_name || student.father_name) && (
              <Button variant="ghost" size="sm" onClick={resetWizard} className="shrink-0">{t("Start over")}</Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 ${i <= step ? "text-neutral-900" : "text-neutral-400"}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"}`}>{i < step ? "✓" : i+1}</span>
                  <span className="hidden sm:block text-xs font-medium">{t(label)}</span>
                </div>
                {i < STEPS.length-1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-green-500" : "bg-neutral-200"}`} />}
              </div>
            ))}
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          <StepCards step={step} student={student} setStudent={setStudent} classId={classId} setClassId={setClassId} classes={classes} selectedClass={selectedClass} classCounts={classCounts} guardians={guardians} setGuardians={setGuardians} newGuardians={newGuardians} setNewGuardians={setNewGuardians} ngForm={ngForm} setNgForm={setNgForm} addNewGuardian={addNewGuardian} medicalInfo={medicalInfo} setMedicalInfo={setMedicalInfo} docs={docs} setDocs={setDocs} handleDocUpload={handleDocUpload} />

          <div className="flex justify-between">
            <Button variant="outline" disabled={step===0} onClick={() => setStep(step-1)}><ChevronLeft size={16} /> {t("Back")}</Button>
            {step < 4 ? <Button disabled={step===1 && !classId} onClick={() => setStep(step+1)}>{t("Next")} <ChevronRight size={16} /></Button>
            : <Button onClick={submit} disabled={saving || !classId}>{saving ? t("Enrolling…") : t("Complete Enrollment")}</Button>}
          </div>
        </>
      ) : (
        <PostEnrollment enrolledStudent={enrolledStudent} selectedClass={selectedClass} student={student} onReset={resetWizard} navigate={navigate} />
      )}
    </div>
  );
}

function StepCards({ step, student, setStudent, classId, setClassId, classes, selectedClass, classCounts, guardians, setGuardians, newGuardians, setNewGuardians, ngForm, setNgForm, addNewGuardian, medicalInfo, setMedicalInfo, docs, setDocs, handleDocUpload }) {
  const { t } = useI18n();
  const set = (k) => (e) => setStudent({ ...student, [k]: e.target.value });
  const setv = (k) => (v) => setStudent({ ...student, [k]: v });
  return (
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">{t(STEPS[step])}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {step === 0 && <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label>{t("First name")} *</Label><Input className="mt-1" required value={student.first_name} onChange={set("first_name")} placeholder={t("Student's name")} /></div>
          <div><Label>{t("Father name")} *</Label><Input className="mt-1" required value={student.father_name} onChange={set("father_name")} /></div>
          <div><Label>{t("Grandfather name")}</Label><Input className="mt-1" value={student.grandfather_name} onChange={set("grandfather_name")} /></div>
          <div><Label>{t("Gender")}</Label><Select value={student.gender} onValueChange={setv("gender")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">{t("Male")}</SelectItem><SelectItem value="female">{t("Female")}</SelectItem></SelectContent></Select></div>
          <div><Label>{t("Date of birth")}</Label><EthiopianDateInput className="mt-1" value={student.date_of_birth} onChange={(iso) => setStudent({ ...student, date_of_birth: iso })} /></div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("Place of birth")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Country</Label><Input className="mt-1" value={student.country_of_birth} onChange={set("country_of_birth")} /></div>
            <div><Label>Region</Label><Input className="mt-1" value={student.region_of_birth} onChange={set("region_of_birth")} /></div>
            <div><Label>Zone</Label><Input className="mt-1" value={student.zone_of_birth} onChange={set("zone_of_birth")} /></div>
            <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_birth} onChange={set("woreda_of_birth")} /></div>
            <div><Label>Kebele of birth</Label><Input className="mt-1" value={student.kebele_of_birth} onChange={set("kebele_of_birth")} /></div>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("Residence")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Region</Label><Input className="mt-1" value={student.region_of_residence} onChange={set("region_of_residence")} /></div>
            <div><Label>Zone</Label><Input className="mt-1" value={student.zone_of_residence} onChange={set("zone_of_residence")} /></div>
            <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_residence} onChange={set("woreda_of_residence")} /></div>
            <div><Label>Kebele</Label><Input className="mt-1" value={student.kebele} onChange={set("kebele")} /></div>
            <div><Label>{t("House / Address")}</Label><Input className="mt-1" value={student.home_address} onChange={set("home_address")} /></div>
            <div><Label>{t("Area type")}</Label><Select value={student.location_type} onValueChange={setv("location_type")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="urban">{t("Urban")}</SelectItem><SelectItem value="rural">{t("Rural")}</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("Background & socioeconomic")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><Label>{t("Nationality")}</Label><Input className="mt-1" value={student.nationality} onChange={set("nationality")} /></div>
            <div><Label>{t("Previous school")}</Label><Input className="mt-1" value={student.previous_school} onChange={set("previous_school")} /></div>
            <div><Label>{t("Admission type")}</Label><Select value={student.admission_type} onValueChange={setv("admission_type")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">{t("New")}</SelectItem><SelectItem value="transfer_in">{t("Transfer in")}</SelectItem></SelectContent></Select></div>
            <div><Label>{t("Economic status")}</Label><Select value={student.economic_status} onValueChange={setv("economic_status")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="Poor">{t("Poor")}</SelectItem><SelectItem value="Medium">{t("Medium")}</SelectItem><SelectItem value="Rich">{t("Rich")}</SelectItem></SelectContent></Select></div>
            <div><Label>{t("Parent status")}</Label><Select value={student.parent_status} onValueChange={setv("parent_status")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="both_alive">{t("Both alive")}</SelectItem><SelectItem value="father_deceased">{t("Father deceased")}</SelectItem><SelectItem value="mother_deceased">{t("Mother deceased")}</SelectItem><SelectItem value="both_deceased">{t("Both deceased")}</SelectItem></SelectContent></Select></div>
            <div><Label>{t("Family head gender")}</Label><Select value={student.family_head_gender} onValueChange={setv("family_head_gender")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">{t("Male")}</SelectItem><SelectItem value="female">{t("Female")}</SelectItem></SelectContent></Select></div>
            <div><Label>{t("Has disability?")}</Label><Select value={student.disability ? "yes" : "no"} onValueChange={(v) => setStudent({ ...student, disability: v==="yes" })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">{t("No")}</SelectItem><SelectItem value="yes">{t("Yes")}</SelectItem></SelectContent></Select></div>
            {student.disability && <div><Label>{t("Disability type")}</Label><Input className="mt-1" value={student.disability_type} onChange={set("disability_type")} /></div>}
            <div><Label>{t("National ID")}</Label><Input className="mt-1" value={student.national_id} onChange={set("national_id")} /></div>
            <div><Label>{t("Emergency contact")}</Label><Input className="mt-1" value={student.emergency_contact} placeholder="09…" onChange={set("emergency_contact")} /></div>
          </div>
        </div>
      </div>}
      {step === 1 && <ClassPickStep classes={classes} classId={classId} setClassId={setClassId} classCounts={classCounts} />}
      {step === 2 && <GuardianStep guardians={guardians} setGuardians={setGuardians} newGuardians={newGuardians} setNewGuardians={setNewGuardians} ngForm={ngForm} setNgForm={setNgForm} addNewGuardian={addNewGuardian} />}
      {step === 3 && <div className="space-y-4"><div><Label>{t("Emergency contact")}</Label><Input className="mt-1" value={student.emergency_contact} onChange={set("emergency_contact")} placeholder="09…" /></div><div><Label>{t("Medical conditions / notes")}</Label><textarea rows={3} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder={t("Allergies, chronic conditions, medication…")} onChange={(e) => setMedicalInfo({ notes: e.target.value })} /></div><div><Label>{t("Documents (birth certificate, previous report card, photo)")}</Label><label className="mt-1 flex items-center gap-2 border-dashed border-2 rounded-lg p-4 cursor-pointer hover:bg-muted/40"><FileUp size={18} className="text-gray-400" /><span className="text-sm text-muted-foreground">{t("Click to attach files (max 3MB each)")}</span><input type="file" multiple className="hidden" onChange={handleDocUpload} /></label>{docs.length > 0 && <ul className="mt-2 space-y-1">{docs.map((d,i) => <li key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1.5"><span className="truncate">{d.name}</span><button onClick={() => setDocs(docs.filter((_,j) => j!==i))}><Trash2 size={14} className="text-red-500" /></button></li>)}</ul>}</div></div>}
      {step === 4 && <ReviewStep student={student} selectedClass={selectedClass} guardians={guardians} newGuardians={newGuardians} docs={docs} medicalInfo={medicalInfo} />}
    </CardContent></Card>
  );
}

function ClassPickStep({ classes, classId, setClassId, classCounts }) {
  const { t } = useI18n();
  const capacityColor = (count, capacity) => {
    if (!capacity) return { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Open" };
    const pct = (count / capacity) * 100;
    if (pct >= 100) return { bar: "bg-rose-500", text: "text-rose-600", badge: "bg-rose-50 text-rose-700 border-rose-200", label: "Full" };
    if (pct >= 80) return { bar: "bg-amber-500", text: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Almost full" };
    return { bar: "bg-emerald-500", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Open" };
  };

  const grouped = {};
  classes.forEach((c) => {
    const key = c.level_group || "primary";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });
  const GROUP_LABELS = { nursery: "Nursery", kg: "Kindergarten", primary: "Primary", secondary: "Secondary" };
  const GROUP_ORDER = ["nursery", "kg", "primary", "secondary"];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {classId ? t("Selected:") : t("Pick a class and section —")} {classId && <span className="font-semibold text-neutral-900">{classes.find((c) => c.id === classId)?.name}</span>}
      </p>
      {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
        <div key={group}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t(GROUP_LABELS[group])}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {grouped[group].map((c) => {
              const count = classCounts?.[c.id] ?? 0;
              const cap = c.capacity ? Number(c.capacity) : null;
              const pct = cap ? Math.min(100, Math.round((count / cap) * 100)) : null;
              const colors = capacityColor(count, cap);
              const selected = classId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClassId(classId === c.id ? "" : c.id)}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${selected ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-1 bg-neutral-900/[0.03]" : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold leading-tight">{c.name}</p>
                      {c.section && <p className="text-xs text-muted-foreground">{t("Section")} {c.section}</p>}
                      {typeof c.grade_level !== "undefined" && c.grade_level !== null && (
                        <p className="text-xs text-muted-foreground">{t("Grade")} {c.grade_level}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors.badge}`}>{t(colors.label)}</span>
                  </div>

                  {c.room && <p className="text-xs text-muted-foreground mt-2">{t("Room")}: {c.room}</p>}
                  {c.class_teacher_id && <p className="text-xs text-muted-foreground">{t("Teacher")}: {c.teacher_first_name || "—"} {c.teacher_last_name || ""}</p>}

                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-semibold ${colors.text}`}>{count} {t("students")}</span>
                      {cap ? <span className={`font-semibold ${colors.text}`}>{pct}% / {cap}</span> : <span className="text-muted-foreground">{t("no limit")}</span>}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-neutral-100">
                      <div className={`h-full ${colors.bar}`} style={{ width: cap ? `${pct}%` : "0%" }} />
                    </div>
                  </div>

                  {selected && (
                    <p className="mt-2 text-[11px] font-semibold text-neutral-900 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {t("Selected — click Next to continue")}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {classes.length === 0 && <p className="text-sm text-muted-foreground">{t("No classes exist yet. Ask an admin to create classes first.")}</p>}
    </div>
  );
}

function GuardianStep({ guardians, setGuardians, newGuardians, setNewGuardians, ngForm, setNgForm, addNewGuardian }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data } = useQuery({ queryKey: ["parent-search", debouncedSearch], queryFn: () => api.get("/parents", { params: { search: debouncedSearch } }), enabled: search.length >= 2 });
  const candidates = (data?.data || []).slice(0, 6);
  const alreadyIds = new Set(guardians.map((g) => g.parent_id));
  function add(p) { if (alreadyIds.has(p.id)) return; setGuardians([...guardians, { parent_id: p.id, first_name: p.first_name, last_name: p.last_name, phone: p.phone, relationship: p.relationship || "guardian", education_level: "", is_primary: guardians.length === 0 }]); }
  return (<div className="space-y-5">
    <div><p className="text-sm font-medium mb-2 flex items-center gap-2"><Search size={15} /> {t("Link an existing guardian")}</p><Input placeholder={t("Type a parent name or phone…")} value={search} onChange={(e) => setSearch(e.target.value)} />{candidates.length > 0 && <div className="mt-2 space-y-1">{candidates.filter((c) => !alreadyIds.has(c.id)).map((c) => <button key={c.id} type="button" onClick={() => add(c)} className="w-full text-left text-sm px-2 py-1.5 rounded border hover:bg-muted flex justify-between"><span>{c.first_name} {c.last_name}</span><span className="text-muted-foreground text-xs">{c.phone}</span></button>)}</div>}</div>
    <div className="border-t pt-4"><p className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus size={15} /> {t("Create new guardian")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><Label>{t("First name")} *</Label><Input value={ngForm.first_name} onChange={(e) => setNgForm({ ...ngForm, first_name: e.target.value })} /></div>
        <div><Label>{t("Last name")} *</Label><Input value={ngForm.last_name} onChange={(e) => setNgForm({ ...ngForm, last_name: e.target.value })} /></div>
        <div><Label>{t("Phone")} *</Label><Input value={ngForm.phone} onChange={(e) => setNgForm({ ...ngForm, phone: e.target.value })} placeholder="09…" /></div>
        <div><Label>{t("Relationship")}</Label><Select value={ngForm.relationship} onValueChange={(v) => setNgForm({ ...ngForm, relationship: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{t("Education level")}</Label><Select value={ngForm.education_level} onValueChange={(v) => setNgForm({ ...ngForm, education_level: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{EDU_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-end pb-2"><Button size="sm" onClick={addNewGuardian} disabled={!ngForm.first_name || !ngForm.last_name || ngForm.phone.length < 7}>{t("Add")}</Button></div>
      </div>
      <GuardianList guardians={guardians} newGuardians={newGuardians} setGuardians={setGuardians} setNewGuardians={setNewGuardians} />
    </div>
  </div>);
}

function GuardianList({ guardians, newGuardians, setGuardians, setNewGuardians }) {
  const { t } = useI18n();
  if (!guardians.length && !newGuardians.length) return null;
  return (<div className="mt-4 space-y-2">
    {[...guardians.map((g) => ({ ...g, _new: false })), ...newGuardians.map((g) => ({ ...g, _new: true }))].map((g, i) => (
      <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
        <div><span className="font-medium">{g.first_name} {g.last_name}</span><span className="text-muted-foreground"> · {g.phone}{g.relationship ? ` · ${g.relationship}` : ""}{g.education_level ? ` · ${g.education_level}` : ""}</span>{g.is_primary && <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-bold">{t("PRIMARY")}</span>}</div>
        <button className="text-gray-400 hover:text-red-600" onClick={() => g._new ? setNewGuardians(newGuardians.filter((_, j) => j !== (i - guardians.length))) : setGuardians(guardians.filter((x) => x.parent_id !== g.parent_id))}><Trash2 size={15} /></button>
      </div>
    ))}
  </div>);
}

function ReviewStep({ student, selectedClass, guardians, newGuardians, docs, medicalInfo }) {
  const { t } = useI18n();
  return (<div className="space-y-3 text-sm">
    <Row l={t("Name")} v={`${student.first_name} ${student.father_name || ""} ${student.grandfather_name || ""}`} />
    <Row l={t("Gender / DOB")} v={`${student.gender || "—"} · ${student.date_of_birth || "—"}`} />
    <Row l={t("Admission")} v={`${student.admission_type} · prev: ${student.previous_school || "—"}`} />
    <Row l={t("Class")} v={selectedClass ? `${selectedClass.name}${selectedClass.section ? ` (${selectedClass.section})` : ""}` : "—"} />
    <Row l={t("Guardians")} v={[...guardians, ...newGuardians].map((g) => `${g.first_name} ${g.last_name} (${g.phone})`).join(", ") || "—"} />
    <Row l={t("Emergency contact")} v={student.emergency_contact || "—"} />
    <Row l={t("Medical notes")} v={Object.values(medicalInfo).filter(Boolean).join(", ") || "—"} />
    <Row l={t("Documents")} v={`${docs.length} ${t("attached")}`} />
  </div>);
}
function Row({ l, v }) { return <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{l}</span><span className="font-medium text-right max-w-[55%] truncate">{v}</span></div>; }

function PostEnrollment({ enrolledStudent, selectedClass, student, onReset, navigate }) {
  const { t } = useI18n();
  const creds = enrolledStudent?.__credentials || {};
  const [showPayment, setShowPayment] = useState(false);
  const [showCreds, setShowCreds] = useState(true);
  const [paymentDone, setPaymentDone] = useState(false);
  const [copied, setCopied] = useState("");

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    }
  }

  const CredentialRow = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase">{label}</p>
        <p className="text-xl sm:text-2xl font-mono font-bold mt-0.5 break-all">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => copy(value, value)} className="shrink-0">
        {copied === value ? t("Copied") : t("Copy")}
      </Button>
    </div>
  );

  if (paymentDone) return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-6">
      <PartyPopper className="h-14 w-14 mx-auto text-green-500" />
      <h1 className="text-2xl font-bold">{t("All done!")}</h1>
      <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm mx-auto max-w-sm space-y-1.5">
        <div className="flex justify-between"><span className="text-muted-foreground">{t("Student ID")}</span><span className="font-mono font-bold">{enrolledStudent.student_number}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">{t("Class")}</span><span>{selectedClass?.name || "—"}</span></div>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate(`/students/${enrolledStudent.id}`)}>{t("Open student record")}</Button>
        <Button onClick={onReset}>{t("Enroll another")}</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <div className="text-center"><PartyPopper className="h-14 w-14 mx-auto text-green-500" /><h1 className="text-2xl font-bold mt-3">{t("Student enrolled")}</h1><p className="text-muted-foreground text-sm">{enrolledStudent.student_number}</p></div>

      {showCreds && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 border-b bg-neutral-900 text-white">
            <CardTitle className="text-base flex items-center gap-2"><KeyRound size={16} /> {t("Login credentials")}</CardTitle>
            <p className="text-xs text-neutral-400">{t("Hand these to the student and guardians — they can change the password after first login.")}</p>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {creds.student && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">{t("Student")}</p>
                <div className="space-y-2">
                  <CredentialRow label={t("Username")} value={creds.student.username} />
                  <CredentialRow label={t("Password")} value="1234" />
                </div>
              </div>
            )}
            {(creds.guardians || []).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">{t("Guardians")}</p>
                <div className="space-y-2">
                  {(creds.guardians || []).map((g, i) => (
                    <div key={i} className="pb-2">
                      <p className="text-sm font-medium mb-1.5">{g.name}</p>
                      <CredentialRow label={t("Username")} value={g.username} />
                    </div>
                  ))}
                  <CredentialRow label={t("Password (all guardians)")} value="1234" />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("Default password is")} <strong className="font-mono">1234</strong> {t("for everyone.")}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        {!showPayment ? <Button onClick={() => setShowPayment(true)} className="flex items-center gap-2"><CreditCard size={16} /> {t("Collect payment now")}</Button>
        : <PaymentDialog enrolledStudent={enrolledStudent} onDone={() => { setShowPayment(false); setPaymentDone(true); }} />}
      </div>
      {!showPayment && <div className="text-center"><Button variant="ghost" onClick={() => { setShowCreds(false); setPaymentDone(true); }}>{t("Skip payment")}</Button></div>}
    </div>
  );
}

function PaymentDialog({ enrolledStudent, onDone }) {
  const { t } = useI18n();
  const { data: feeData } = useQuery({ queryKey: ["fee-structures"], queryFn: () => api.get("/fees/structures") });
  const fees = feeData?.data || [];
  const [selFee, setSelFee] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const f = fees.find((x) => x.id === selFee);

  async function collectPayment(e) { e.preventDefault(); setSaving(true); setPaymentError(""); try {
    const payAmt = Number(amount) || Number(f?.amount || 0);
    await api.post("/fees/payments", {
      student_id: enrolledStudent.user_id,
      amount_paid: payAmt,
      payment_method: method,
      fee_structure_id: selFee || undefined,
      paid_date: new Date().toISOString().slice(0, 10),
    });
    onDone();
  } catch (err) { setPaymentError(err?.error?.message || err?.message || t("Payment failed")); } finally { setSaving(false); }
  }

  return (
    <Card><CardContent className="pt-6 pb-4">
      <form onSubmit={collectPayment} className="space-y-3 text-left">
        <h3 className="font-semibold flex items-center gap-2"><CreditCard size={15} /> {t("Record payment for")} {enrolledStudent.student_number}</h3>
        {paymentError && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{paymentError}</div>}
        <div>
          <Label>{t("Fee structure")}</Label>
          {fees.length === 0 ? (
            <p className="text-sm text-amber-600 mt-1">{t("No fee structures available yet — ask an admin to create them.")}</p>
          ) : (
            <select value={selFee} onChange={(e) => { setSelFee(e.target.value); if (e.target.value) { const ff = fees.find((x) => x.id === e.target.value); if (ff) setAmount(ff.amount || ""); } }} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">— {t("Choose fee")} —</option>
              {fees.map((x) => <option key={x.id} value={x.id}>{x.name} ({Number(x.amount||0).toLocaleString()} ETB)</option>)}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t("Amount (ETB)")}</Label><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div><Label>{t("Method")}</Label><Select value={method} onValueChange={setMethod}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">{t("Cash")}</SelectItem><SelectItem value="bank">{t("Bank Transfer")}</SelectItem><SelectItem value="mobile">{t("Mobile Money (Telebirr/CBE Birr)")}</SelectItem></SelectContent></Select></div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onDone}>{t("Skip")}</Button>
          <Button type="submit" disabled={saving || !selFee}>{saving ? t("Saving…") : t("Take payment")}</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}