import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CheckCircle2, ChevronLeft, ChevronRight, UserPlus, Search, FileUp, Trash2, PartyPopper, KeyRound } from "lucide-react";

const STEPS = ["Student", "Class", "Guardian", "Medical & Docs", "Review"];
const RELATIONSHIPS = ["father", "mother", "brother", "sister", "grandfather", "grandmother", "uncle", "aunt", "other"];

export default function EnrollmentWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { ...student, __credentials }

  // Step 1 — student
  const [student, setStudent] = useState({
    first_name: "", last_name: "", gender: "", date_of_birth: "",
    father_name: "", grandfather_name: "", mother_name: "",
    nationality: "Ethiopian", region_of_birth: "", zone_of_birth: "", woreda_of_birth: "",
    region_of_residence: "", zone_of_residence: "", woreda_of_residence: "", kebele: "",
    home_address: "", location_type: "urban",
    previous_school: "", admission_type: "new",
    disability: false, disability_type: "",
    economic_status: "", parent_status: "", family_head_gender: "",
    national_id: "", emergency_contact: "",
  });

  // Step 2 — placement
  const [classId, setClassId] = useState("");

  // Step 3 — guardians
  const [guardians, setGuardians] = useState([]);      // existing parent_id links
  const [newGuardians, setNewGuardians] = useState([]); // inline created
  const [ngForm, setNgForm] = useState({ first_name: "", last_name: "", phone: "", relationship: "father", is_primary: true });

  // Step 4 — medical & docs
  const [medicalInfo, setMedicalInfo] = useState({});
  const [docs, setDocs] = useState([]); // { type, name, dataUrl }

  const { data: classesData } = useQuery({ queryKey: ["classes-enroll"], queryFn: () => api.get("/classes?limit=300") });
  const classes = classesData?.data || [];
  const selectedClass = classes.find((c) => c.id === classId);

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
      if (f.size > 3 * 1024 * 1024) continue; // 3MB cap per doc
      const dataUrl = await fileToDataUrl(f);
      setDocs((d) => [...d, { name: f.name, dataUrl }]);
    }
    e.target.value = "";
  }

  function addNewGuardian() {
    if (!ngForm.first_name || !ngForm.last_name || ngForm.phone.length < 7) return;
    setNewGuardians((g) => [...g, { ...ngForm }]);
    setNgForm({ first_name: "", last_name: "", phone: "", relationship: "mother", is_primary: !newGuardians.length && !guardians.length });
  }

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...student,
        class_id: classId,
        enrollment_date: new Date().toISOString().slice(0, 10),
        status: "active",
        medical_info: Object.keys(medicalInfo).length ? medicalInfo : undefined,
        new_guardians: newGuardians,
        guardians: guardians.map((g) => ({
          parent_id: g.parent_id,
          relationship: g.relationship,
          is_primary: g.is_primary,
        })),
      };
      const res = await api.post("/students/enroll", payload);
      const student = res.data;

      for (const doc of docs) {
        await api.post(`/students/${student.id}/documents`, {
          type: "other",
          name: doc.name,
          file_url: doc.dataUrl,
        }).catch(() => {});
      }

      setResult(student);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Enrollment failed");
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    const creds = result.__credentials || {};
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <PartyPopper className="h-14 w-14 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold">Student enrolled successfully</h1>
            <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm space-y-1.5 mx-auto max-w-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Student ID</span><span className="font-mono font-bold">{result.student_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span>{selectedClass?.name || "—"}</span></div>
            </div>

            {/* Login credentials handout */}
            <div className="rounded-lg border-2 border-dashed border-neutral-300 p-4 text-left text-sm mx-auto max-w-sm">
              <p className="font-semibold mb-2 flex items-center gap-2"><KeyRound size={15} /> Login accounts (hand these to the family)</p>
              {creds.student && (
                <div className="flex justify-between py-1 border-b">
                  <span>Student login</span>
                  <span className="font-mono">{creds.student.username} / 1234</span>
                </div>
              )}
              {(creds.guardians || []).map((g, i) => (
                <div key={i} className="flex justify-between py-1 border-b last:border-0">
                  <span>{g.name}</span>
                  <span className="font-mono">{g.username} / 1234</span>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground mt-2">
                Default password is <strong>1234</strong> — they should change it after first login.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate(`/students/${result.id}`)}>Open student record</Button>
              <Button onClick={() => navigate(`/payments?student=${result.id}`)}>Record first payment</Button>
              <Button variant="ghost" onClick={() => { setResult(null); setStep(0); }}>Enroll another</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enroll New Student</h1>
        <p className="text-muted-foreground">Register the student, assign a class and add guardians in one flow</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${i <= step ? "text-neutral-900" : "text-neutral-400"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"
              }`}>{i < step ? "✓" : i + 1}</span>
              <span className="hidden sm:block text-xs font-medium">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-green-500" : "bg-neutral-200"}`} />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && <StepStudent student={student} setStudent={setStudent} />}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Class & Section *</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose class…" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.section ? ` · Section ${c.section}` : ""}{c.grade_level ? ` (Grade ${c.grade_level})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Room: {selectedClass.room || "—"} · Capacity: {selectedClass.capacity ?? "—"}
                  </p>
                )}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <ExistingGuardianPicker guardians={guardians} setGuardians={setGuardians} />
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus size={15} /> Create new guardian</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First name *</Label><Input value={ngForm.first_name} onChange={(e) => setNgForm({ ...ngForm, first_name: e.target.value })} /></div>
                  <div><Label>Last name *</Label><Input value={ngForm.last_name} onChange={(e) => setNgForm({ ...ngForm, last_name: e.target.value })} /></div>
                  <div><Label>Phone * (required)</Label><Input value={ngForm.phone} onChange={(e) => setNgForm({ ...ngForm, phone: e.target.value })} placeholder="09…" /></div>
                  <div>
                    <Label>Relationship</Label>
                    <Select value={ngForm.relationship} onValueChange={(v) => setNgForm({ ...ngForm, relationship: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input type="checkbox" checked={ngForm.is_primary} onChange={(e) => setNgForm({ ...ngForm, is_primary: e.target.checked })} />
                  Primary contact
                </label>
                <Button size="sm" className="mt-3" onClick={addNewGuardian}
                  disabled={!ngForm.first_name || !ngForm.last_name || ngForm.phone.length < 7}>
                  Add guardian
                </Button>

                {[...guardians, ...newGuardians].length > 0 && (
                  <div className="mt-4 space-y-2">
                    {[...guardians.map((g) => ({ ...g, isNew: false })), ...newGuardians.map((g) => ({ ...g, isNew: true }))].map((g, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                        <div>
                          <span className="font-medium">{g.first_name} {g.last_name}</span>
                          <span className="text-muted-foreground"> · {g.phone}{g.relationship ? ` · ${g.relationship}` : ""}</span>
                          {g.is_primary && <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-900 text-white text-[10px] font-semibold">PRIMARY</span>}
                        </div>
                        <button className="text-gray-400 hover:text-red-600" onClick={() =>
                          g.isNew ? setNewGuardians(newGuardians.filter((_, j) => j !== i - guardians.length)) : setGuardians(guardians.filter((x) => x.parent_id !== g.parent_id))
                        }><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label>Emergency contact</Label>
                <Input className="mt-1" value={student.emergency_contact} onChange={(e) => setStudent({ ...student, emergency_contact: e.target.value })} placeholder="09…" />
              </div>
              <div>
                <Label>Medical conditions / notes</Label>
                <textarea rows={3} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Allergies, chronic conditions, medication…"
                  onChange={(e) => setMedicalInfo({ notes: e.target.value })} />
              </div>
              <div>
                <Label>Documents (birth certificate, previous report card, photo)</Label>
                <label className="mt-1 flex items-center gap-2 border-dashed border-2 rounded-lg p-4 cursor-pointer hover:bg-muted/40">
                  <FileUp size={18} className="text-gray-400" />
                  <span className="text-sm text-muted-foreground">Click to attach files (max 3MB each)</span>
                  <input type="file" multiple className="hidden" onChange={handleDocUpload} />
                </label>
                {docs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {docs.map((d, i) => (
                      <li key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1.5">
                        <span className="truncate">{d.name}</span>
                        <button onClick={() => setDocs(docs.filter((_, j) => j !== i))}><Trash2 size={14} className="text-red-500" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <Row label="Name">{student.first_name} {student.last_name}</Row>
              <Row label="Gender / DOB">{student.gender || "—"} · {student.date_of_birth || "—"}</Row>
              <Row label="Admission">{student.admission_type} · prev: {student.previous_school || "—"}</Row>
              <Row label="Class">{selectedClass ? `${selectedClass.name}${selectedClass.section ? ` (${selectedClass.section})` : ""}` : "—"}</Row>
              <Row label="Guardians">{[...guardians, ...newGuardians].map((g) => `${g.first_name} ${g.last_name} (${g.phone})`).join(", ") || "—"}</Row>
              <Row label="Emergency contact">{student.emergency_contact || "—"}</Row>
              <Row label="Documents">{docs.length} attached</Row>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ChevronLeft size={16} /> Back
        </Button>
        {step < 4 ? (
          <Button disabled={step === 1 && !classId} onClick={() => setStep(step + 1)}>
            Next <ChevronRight size={16} />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving || !classId}>
            {saving ? "Enrolling…" : "Complete Enrollment"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{children}</span></div>;
}

function StepStudent({ student, setStudent }) {
  const set = (k) => (e) => setStudent({ ...student, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>First name *</Label><Input className="mt-1" required value={student.first_name} onChange={set("first_name")} /></div>
        <div><Label>Last name *</Label><Input className="mt-1" required value={student.last_name} onChange={set("last_name")} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Gender</Label>
          <Select value={student.gender} onValueChange={(v) => setStudent({ ...student, gender: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Date of birth</Label><Input type="date" className="mt-1" value={student.date_of_birth} onChange={set("date_of_birth")} /></div>
        <div><Label>Nationality</Label><Input className="mt-1" value={student.nationality} onChange={set("nationality")} /></div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Family names (as on birth certificate)</p>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Father name</Label><Input className="mt-1" value={student.father_name} onChange={set("father_name")} /></div>
          <div><Label>Grandfather name</Label><Input className="mt-1" value={student.grandfather_name} onChange={set("grandfather_name")} /></div>
          <div><Label>Mother name</Label><Input className="mt-1" value={student.mother_name} onChange={set("mother_name")} /></div>
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Birth place</p>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Region</Label><Input className="mt-1" value={student.region_of_birth} onChange={set("region_of_birth")} /></div>
          <div><Label>Zone / Sub-city</Label><Input className="mt-1" value={student.zone_of_birth} onChange={set("zone_of_birth")} /></div>
          <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_birth} onChange={set("woreda_of_birth")} /></div>
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Residence</p>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Region</Label><Input className="mt-1" value={student.region_of_residence} onChange={set("region_of_residence")} /></div>
          <div><Label>Zone / Sub-city</Label><Input className="mt-1" value={student.zone_of_residence} onChange={set("zone_of_residence")} /></div>
          <div><Label>Woreda</Label><Input className="mt-1" value={student.woreda_of_residence} onChange={set("woreda_of_residence")} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div><Label>Kebele</Label><Input className="mt-1" value={student.kebele} onChange={set("kebele")} /></div>
          <div><Label>House / Address</Label><Input className="mt-1" value={student.home_address} onChange={set("home_address")} /></div>
          <div>
            <Label>Location type</Label>
            <Select value={student.location_type} onValueChange={(v) => setStudent({ ...student, location_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="urban">Urban</SelectItem><SelectItem value="rural">Rural</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Background</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Previous school</Label><Input className="mt-1" value={student.previous_school} onChange={set("previous_school")} /></div>
          <div>
            <Label>Admission type</Label>
            <Select value={student.admission_type} onValueChange={(v) => setStudent({ ...student, admission_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="transfer_in">Transfer in</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>Has disability?</Label>
            <Select value={student.disability ? "yes" : "no"} onValueChange={(v) => setStudent({ ...student, disability: v === "yes" })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
            </Select>
          </div>
          {student.disability && <div><Label>Disability type</Label><Input className="mt-1" value={student.disability_type} onChange={set("disability_type")} /></div>}
          <div>
            <Label>Economic status</Label>
            <Select value={student.economic_status} onValueChange={(v) => setStudent({ ...student, economic_status: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent><SelectItem value="regular">Regular</SelectItem><SelectItem value="needy">Needy</SelectItem><SelectItem value="very_needy">Very needy</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>National ID (optional)</Label><Input className="mt-1" value={student.national_id} onChange={set("national_id")} /></div>
        </div>
      </div>
    </div>
  );
}

function ExistingGuardianPicker({ guardians, setGuardians }) {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["parent-search", search],
    queryFn: () => api.get("/parents", { params: { search } }),
    enabled: search.length >= 2,
  });
  const candidates = (data?.data || []).slice(0, 6);
  const alreadyIds = new Set(guardians.map((g) => g.parent_id));

  function add(p) {
    if (alreadyIds.has(p.id)) return;
    setGuardians([...guardians, { parent_id: p.id, first_name: p.first_name, last_name: p.last_name, phone: p.phone, relationship: p.relationship || "guardian", is_primary: guardians.length === 0 }]);
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-2"><Search size={15} /> Link an existing guardian</p>
      <Input placeholder="Type a parent name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {candidates.length > 0 && (
        <div className="mt-2 space-y-1">
          {candidates.filter((c) => !alreadyIds.has(c.id)).map((c) => (
            <button key={c.id} type="button" onClick={() => add(c)}
              className="w-full text-left text-sm px-2 py-1.5 rounded border hover:bg-muted flex justify-between">
              <span>{c.first_name} {c.last_name}</span>
              <span className="text-muted-foreground text-xs">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
