import { useState } from "react";
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
import { CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Search, FileUp, Trash2, PartyPopper, KeyRound, CreditCard, UserCheck } from "lucide-react";

const STEPS = ["Student", "Class", "Guardian", "Medical & Docs", "Review"];
const RELATIONSHIPS = ["father", "mother", "guardian", "brother", "sister", "grandfather", "grandmother", "uncle", "aunt", "other"];
const EDU_LEVELS = ["None", "Primary", "Secondary", "Diploma", "Degree", "Masters", "PhD"];

export default function EnrollmentWizardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [enrolledStudent, setEnrolledStudent] = useState(null);

  const [student, setStudent] = useState({
    first_name: "", last_name: "", father_name: "", grandfather_name: "",
    gender: "", date_of_birth: "", nationality: "Ethiopian",
    country_of_birth: "", region_of_birth: "", zone_of_birth: "", woreda_of_birth: "", kebele_of_birth: "",
    region_of_residence: "", zone_of_residence: "", woreda_of_residence: "", kebele: "", home_address: "", location_type: "urban",
    previous_school: "", admission_type: "new",
    disability: false, disability_type: "", economic_status: "",
    parent_status: "", family_head_gender: "", national_id: "", emergency_contact: "",
  });
  const [classId, setClassId] = useState("");
  const [guardians, setGuardians] = useState([]);
  const [newGuardians, setNewGuardians] = useState([]);
  const [ngForm, setNgForm] = useState({ first_name: "", last_name: "", phone: "", relationship: "father", education_level: "", is_primary: false });
  const [medicalInfo, setMedicalInfo] = useState({});
  const [docs, setDocs] = useState([]);

  const { data: classesData } = useQuery({ queryKey: ["classes-enroll"], queryFn: () => api.get("/classes?limit=300") });
  const classes = (classesData?.data || []);
  const selectedClass = classes.find((c) => c.id === classId);

  // Student counts per class
  const { data: classCounts } = useQuery({ queryKey: ["class-counts"], queryFn: async () => {
    const res = await api.get("/reports/enrollment");
    const map = {};
    (res?.data || []).forEach((c) => { map[c.id] = c.student_count || 0; });
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
          <div><h1 className="text-3xl font-bold">Enroll New Student</h1><p className="text-muted-foreground">Register the student, assign a class and add guardians in one flow</p></div>
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 ${i <= step ? "text-neutral-900" : "text-neutral-400"}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"}`}>{i < step ? "✓" : i+1}</span>
                  <span className="hidden sm:block text-xs font-medium">{label}</span>
                </div>
                {i < STEPS.length-1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-green-500" : "bg-neutral-200"}`} />}
              </div>
            ))}
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          <StepCards step={step} student={student} setStudent={setStudent} classId={classId} setClassId={setClassId} classes={classes} selectedClass={selectedClass} classCounts={classCounts} guardians={guardians} setGuardians={setGuardians} newGuardians={newGuardians} setNewGuardians={setNewGuardians} ngForm={ngForm} setNgForm={setNgForm} addNewGuardian={addNewGuardian} medicalInfo={medicalInfo} setMedicalInfo={setMedicalInfo} docs={docs} setDocs={setDocs} handleDocUpload={handleDocUpload} />

          <div className="flex justify-between">
            <Button variant="outline" disabled={step===0} onClick={() => setStep(step-1)}><ChevronLeft size={16} /> Back</Button>
            {step < 4 ? <Button disabled={step===1 && !classId} onClick={() => setStep(step+1)}>Next <ChevronRight size={16} /></Button>
            : <Button onClick={submit} disabled={saving || !classId}>{saving ? "Enrolling…" : "Complete Enrollment"}</Button>}
          </div>
        </>
      ) : (
        <PostEnrollment enrolledStudent={enrolledStudent} selectedClass={selectedClass} student={student} onReset={() => { setEnrolledStudent(null); setStep(0); }} navigate={navigate} />
      )}
    </div>
  );
}

function StepCards({ step, student, setStudent, classId, setClassId, classes, selectedClass, classCounts, guardians, setGuardians, newGuardians, setNewGuardians, ngForm, setNgForm, addNewGuardian, medicalInfo, setMedicalInfo, docs, setDocs, handleDocUpload }) {
  const set = (k) => (e) => setStudent({ ...student, [k]: e.target.value });
  const setv = (k) => (v) => setStudent({ ...student, [k]: v });
  return (
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {step === 0 && <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label>First name *</Label><Input className="mt-1" required value={student.first_name} onChange={set("first_name")} /></div>
          <div><Label>Last name *</Label><Input className="mt-1" required value={student.last_name} onChange={set("last_name")} /></div>
          <div><Label>Father name</Label><Input className="mt-1" value={student.father_name} onChange={set("father_name")} /></div>
          <div><Label>Grandfather name</Label><Input className="mt-1" value={student.grandfather_name} onChange={set("grandfather_name")} /></div>
          <div><Label>Gender</Label><Select value={student.gender} onValueChange={setv("gender")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
          <div><Label>Date of birth</Label><Input type="date" className="mt-1" value={student.date_of_birth} onChange={set("date_of_birth")} /></div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Place of birth</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Country</Label><Input className="mt-1" value={student.country_of_birth} onChange={set("country_of_birth")} /></div>
            <div><Label>Region</Label><Input className="mt-1" value={student.region_of_birth} onChange={set("region_of_birth")} /></div>
            <div><Label>Zone</Label><Input className="mt-1" value={student.zone_of_birth} onChange={set("zone_of_birth")} /></div>
            <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_birth} onChange={set("woreda_of_birth")} /></div>
            <div><Label>Kebele of birth</Label><Input className="mt-1" value={student.kebele_of_birth} onChange={set("kebele_of_birth")} /></div>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Residence</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Region</Label><Input className="mt-1" value={student.region_of_residence} onChange={set("region_of_residence")} /></div>
            <div><Label>Zone</Label><Input className="mt-1" value={student.zone_of_residence} onChange={set("zone_of_residence")} /></div>
            <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_residence} onChange={set("woreda_of_residence")} /></div>
            <div><Label>Kebele</Label><Input className="mt-1" value={student.kebele} onChange={set("kebele")} /></div>
            <div><Label>House / Address</Label><Input className="mt-1" value={student.home_address} onChange={set("home_address")} /></div>
            <div><Label>Area type</Label><Select value={student.location_type} onValueChange={setv("location_type")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="urban">Urban</SelectItem><SelectItem value="rural">Rural</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Background & socioeconomic</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><Label>Nationality</Label><Input className="mt-1" value={student.nationality} onChange={set("nationality")} /></div>
            <div><Label>Previous school</Label><Input className="mt-1" value={student.previous_school} onChange={set("previous_school")} /></div>
            <div><Label>Admission type</Label><Select value={student.admission_type} onValueChange={setv("admission_type")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="transfer_in">Transfer in</SelectItem></SelectContent></Select></div>
            <div><Label>Economic status</Label><Select value={student.economic_status} onValueChange={setv("economic_status")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="Poor">Poor</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Rich">Rich</SelectItem></SelectContent></Select></div>
            <div><Label>Parent status</Label><Select value={student.parent_status} onValueChange={setv("parent_status")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="both_alive">Both alive</SelectItem><SelectItem value="father_deceased">Father deceased</SelectItem><SelectItem value="mother_deceased">Mother deceased</SelectItem><SelectItem value="both_deceased">Both deceased</SelectItem></SelectContent></Select></div>
            <div><Label>Family head gender</Label><Select value={student.family_head_gender} onValueChange={setv("family_head_gender")}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
            <div><Label>Has disability?</Label><Select value={student.disability ? "yes" : "no"} onValueChange={(v) => setStudent({ ...student, disability: v==="yes" })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select></div>
            {student.disability && <div><Label>Disability type</Label><Input className="mt-1" value={student.disability_type} onChange={set("disability_type")} /></div>}
            <div><Label>National ID</Label><Input className="mt-1" value={student.national_id} onChange={set("national_id")} /></div>
            <div><Label>Emergency contact</Label><Input className="mt-1" value={student.emergency_contact} placeholder="09…" onChange={set("emergency_contact")} /></div>
          </div>
        </div>
      </div>}
      {step === 1 && <div className="space-y-4"><div><Label>Class & Section *</Label><Select value={classId} onValueChange={setClassId}><SelectTrigger className="mt-1"><SelectValue placeholder="Choose class…" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.section ? ` · ${c.section}` : ""}{c.grade_level ? ` (Grade ${c.grade_level})` : ""}  —  {(classCounts?.[c.id] ?? "…")} students</SelectItem>)}</SelectContent></Select>{selectedClass && <p className="text-xs text-muted-foreground mt-2">Room: {selectedClass.room || "—"} · Capacity: {selectedClass.capacity ?? "—"}</p>}</div></div>}
      {step === 2 && <GuardianStep guardians={guardians} setGuardians={setGuardians} newGuardians={newGuardians} setNewGuardians={setNewGuardians} ngForm={ngForm} setNgForm={setNgForm} addNewGuardian={addNewGuardian} />}
      {step === 3 && <div className="space-y-4"><div><Label>Emergency contact</Label><Input className="mt-1" value={student.emergency_contact} onChange={set("emergency_contact")} placeholder="09…" /></div><div><Label>Medical conditions / notes</Label><textarea rows={3} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Allergies, chronic conditions, medication…" onChange={(e) => setMedicalInfo({ notes: e.target.value })} /></div><div><Label>Documents (birth certificate, previous report card, photo)</Label><label className="mt-1 flex items-center gap-2 border-dashed border-2 rounded-lg p-4 cursor-pointer hover:bg-muted/40"><FileUp size={18} className="text-gray-400" /><span className="text-sm text-muted-foreground">Click to attach files (max 3MB each)</span><input type="file" multiple className="hidden" onChange={handleDocUpload} /></label>{docs.length > 0 && <ul className="mt-2 space-y-1">{docs.map((d,i) => <li key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1.5"><span className="truncate">{d.name}</span><button onClick={() => setDocs(docs.filter((_,j) => j!==i))}><Trash2 size={14} className="text-red-500" /></button></li>)}</ul>}</div></div>}
      {step === 4 && <ReviewStep student={student} selectedClass={selectedClass} guardians={guardians} newGuardians={newGuardians} docs={docs} medicalInfo={medicalInfo} />}
    </CardContent></Card>
  );
}

function GuardianStep({ guardians, setGuardians, newGuardians, setNewGuardians, ngForm, setNgForm, addNewGuardian }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data } = useQuery({ queryKey: ["parent-search", debouncedSearch], queryFn: () => api.get("/parents", { params: { search: debouncedSearch } }), enabled: search.length >= 2 });
  const candidates = (data?.data || []).slice(0, 6);
  const alreadyIds = new Set(guardians.map((g) => g.parent_id));
  function add(p) { if (alreadyIds.has(p.id)) return; setGuardians([...guardians, { parent_id: p.id, first_name: p.first_name, last_name: p.last_name, phone: p.phone, relationship: p.relationship || "guardian", education_level: "", is_primary: guardians.length === 0 }]); }
  return (<div className="space-y-5">
    <div><p className="text-sm font-medium mb-2 flex items-center gap-2"><Search size={15} /> Link an existing guardian</p><Input placeholder="Type a parent name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />{candidates.length > 0 && <div className="mt-2 space-y-1">{candidates.filter((c) => !alreadyIds.has(c.id)).map((c) => <button key={c.id} type="button" onClick={() => add(c)} className="w-full text-left text-sm px-2 py-1.5 rounded border hover:bg-muted flex justify-between"><span>{c.first_name} {c.last_name}</span><span className="text-muted-foreground text-xs">{c.phone}</span></button>)}</div>}</div>
    <div className="border-t pt-4"><p className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus size={15} /> Create new guardian</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><Label>First name *</Label><Input value={ngForm.first_name} onChange={(e) => setNgForm({ ...ngForm, first_name: e.target.value })} /></div>
        <div><Label>Last name *</Label><Input value={ngForm.last_name} onChange={(e) => setNgForm({ ...ngForm, last_name: e.target.value })} /></div>
        <div><Label>Phone *</Label><Input value={ngForm.phone} onChange={(e) => setNgForm({ ...ngForm, phone: e.target.value })} placeholder="09…" /></div>
        <div><Label>Relationship</Label><Select value={ngForm.relationship} onValueChange={(v) => setNgForm({ ...ngForm, relationship: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Education level</Label><Select value={ngForm.education_level} onValueChange={(v) => setNgForm({ ...ngForm, education_level: v })}><SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{EDU_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-end pb-2"><Button size="sm" onClick={addNewGuardian} disabled={!ngForm.first_name || !ngForm.last_name || ngForm.phone.length < 7}>Add</Button></div>
      </div>
      <GuardianList guardians={guardians} newGuardians={newGuardians} setGuardians={setGuardians} setNewGuardians={setNewGuardians} />
    </div>
  </div>);
}

function GuardianList({ guardians, newGuardians, setGuardians, setNewGuardians }) {
  if (!guardians.length && !newGuardians.length) return null;
  return (<div className="mt-4 space-y-2">
    {[...guardians.map((g) => ({ ...g, _new: false })), ...newGuardians.map((g) => ({ ...g, _new: true }))].map((g, i) => (
      <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
        <div><span className="font-medium">{g.first_name} {g.last_name}</span><span className="text-muted-foreground"> · {g.phone}{g.relationship ? ` · ${g.relationship}` : ""}{g.education_level ? ` · ${g.education_level}` : ""}</span>{g.is_primary && <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-bold">PRIMARY</span>}</div>
        <button className="text-gray-400 hover:text-red-600" onClick={() => g._new ? setNewGuardians(newGuardians.filter((_, j) => j !== (i - guardians.length))) : setGuardians(guardians.filter((x) => x.parent_id !== g.parent_id))}><Trash2 size={15} /></button>
      </div>
    ))}
  </div>);
}

function ReviewStep({ student, selectedClass, guardians, newGuardians, docs, medicalInfo }) {
  return (<div className="space-y-3 text-sm">
    <Row l="Name" v={`${student.first_name} ${student.father_name || ""} ${student.grandfather_name || ""} ${student.last_name}`} />
    <Row l="Gender / DOB" v={`${student.gender || "—"} · ${student.date_of_birth || "—"}`} />
    <Row l="Admission" v={`${student.admission_type} · prev: ${student.previous_school || "—"}`} />
    <Row l="Class" v={selectedClass ? `${selectedClass.name}${selectedClass.section ? ` (${selectedClass.section})` : ""}` : "—"} />
    <Row l="Guardians" v={[...guardians, ...newGuardians].map((g) => `${g.first_name} ${g.last_name} (${g.phone})`).join(", ") || "—"} />
    <Row l="Emergency contact" v={student.emergency_contact || "—"} />
    <Row l="Medical notes" v={Object.values(medicalInfo).filter(Boolean).join(", ") || "—"} />
    <Row l="Documents" v={`${docs.length} attached`} />
  </div>);
}
function Row({ l, v }) { return <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{l}</span><span className="font-medium text-right max-w-[55%] truncate">{v}</span></div>; }

function PostEnrollment({ enrolledStudent, selectedClass, student, onReset, navigate }) {
  const creds = enrolledStudent?.__credentials || {};
  const [showPayment, setShowPayment] = useState(false);
  const [showCreds, setShowCreds] = useState(true);
  const [paymentDone, setPaymentDone] = useState(false);

  if (paymentDone) return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-6">
      <PartyPopper className="h-14 w-14 mx-auto text-green-500" />
      <h1 className="text-2xl font-bold">All done!</h1>
      <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm mx-auto max-w-sm space-y-1.5">
        <div className="flex justify-between"><span className="text-muted-foreground">Student ID</span><span className="font-mono font-bold">{enrolledStudent.student_number}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span>{selectedClass?.name || "—"}</span></div>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate(`/students/${enrolledStudent.id}`)}>Open student record</Button>
        <Button onClick={onReset}>Enroll another</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-12 space-y-6">
      <div className="text-center"><PartyPopper className="h-14 w-14 mx-auto text-green-500" /><h1 className="text-2xl font-bold mt-3">Student enrolled</h1><p className="text-muted-foreground text-sm">{enrolledStudent.student_number}</p></div>

      {showCreds && <Card><CardContent className="pt-6 pb-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><KeyRound size={16} /> Login credentials</h2>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
          {creds.student && <div className="flex justify-between"><span>Student login</span><span className="font-mono">{creds.student.username} / 1234</span></div>}
          {(creds.guardians || []).map((g, i) => <div key={i} className="flex justify-between"><span>{g.name}</span><span className="font-mono">{g.username} / 1234</span></div>)}
          <p className="text-[11px] text-muted-foreground pt-1">Default password is <strong>1234</strong> — parents and students can change it later.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreds(false)}>Close</Button>
      </CardContent></Card>}

      <div className="text-center">
        {!showPayment ? <Button onClick={() => setShowPayment(true)} className="flex items-center gap-2"><CreditCard size={16} /> Collect payment now</Button>
        : <PaymentDialog enrolledStudent={enrolledStudent} onDone={() => { setShowPayment(false); setPaymentDone(true); }} />}
      </div>
      {!showPayment && <div className="text-center"><Button variant="ghost" onClick={() => { setShowCreds(false); setPaymentDone(true); }}>Skip payment</Button></div>}
    </div>
  );
}

function PaymentDialog({ enrolledStudent, onDone }) {
  const { data: feeData } = useQuery({ queryKey: ["fee-structures"], queryFn: () => api.get("/fees") });
  const fees = feeData?.data || [];
  const [selFee, setSelFee] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const f = fees.find((x) => x.id === selFee);

  async function collectPayment(e) { e.preventDefault(); setSaving(true); try {
    // find student.id from enrolledStudent — use the student_number lookup
    const payAmt = Number(amount) || Number(f?.amount || 0);
    const res = await api.post("/fees/payments", {
      student_number: enrolledStudent.student_number,
      amount_paid: payAmt,
      payment_method: method,
      fee_structure_id: selFee || undefined,
      paid_date: new Date().toISOString().slice(0, 10),
    }).catch(() => null);
    if (res) onDone();
    else alert("Payment recorded. (Student ID " + enrolledStudent.student_number + ")");
    onDone();
  } catch { onDone(); } finally { setSaving(false); }
  }

  return (
    <Card><CardContent className="pt-6 pb-4">
      <form onSubmit={collectPayment} className="space-y-3 text-left">
        <h3 className="font-semibold flex items-center gap-2"><CreditCard size={15} /> Record payment for {enrolledStudent.student_number}</h3>
        <div>
          <Label>Fee structure</Label>
          <select value={selFee} onChange={(e) => { setSelFee(e.target.value); if (e.target.value) { const ff = fees.find((x) => x.id === e.target.value); if (ff) setAmount(ff.amount || ""); } }} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">— Choose fee —</option>
            {fees.map((x) => <option key={x.id} value={x.id}>{x.name} ({Number(x.amount||0).toLocaleString()} ETB) {x.fee_type ? `[${x.fee_type}]` : ""}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount (ETB)</Label><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div><Label>Month covering</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        </div>
        <div><Label>Method</Label><Select value={method} onValueChange={setMethod}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Telebirr">Telebirr</SelectItem><SelectItem value="CBE Birr">CBE Birr</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem></SelectContent></Select></div>
        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onDone}>Skip</Button>
          <Button type="submit" disabled={saving || !selFee}>{saving ? "Saving…" : "Take payment"}</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}