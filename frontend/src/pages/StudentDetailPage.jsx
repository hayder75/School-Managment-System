import { StudentAvatar } from "../components/ui/StudentAvatar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { ArrowLeft, Plus, Trash2, FileText, Stethoscope, AlertTriangle, Award, History, Download, BookOpen, Phone, UserRound, Wallet } from "lucide-react";

const TABS = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "medical", label: "Medical", icon: Stethoscope },
  { key: "discipline", label: "Discipline", icon: AlertTriangle },
  { key: "achievements", label: "Achievements", icon: Award },
  { key: "enrollments", label: "Enrollments", icon: BookOpen },
  { key: "history", label: "Status History", icon: History },
];

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("documents");
  const [loading, setLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [medical, setMedical] = useState(null);
  const [discipline, setDiscipline] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [newDoc, setNewDoc] = useState({ type: "other", name: "", file_url: "" });
  const [newMed, setNewMed] = useState({ blood_group: "", allergies: "", chronic_conditions: "" });
  const [newDisc, setNewDisc] = useState({ incident_type: "misconduct", description: "" });
  const [newAch, setNewAch] = useState({ type: "academic", title: "", description: "", achieved_date: "" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    loadStudent();
  }, [id]);

  async function loadStudent() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
      loadTabData("documents");
    } catch (err) {
      setLoadError(err?.error?.message || err?.message || "Failed to load student");
    } finally {
      setLoading(false);
    }
  }

  async function loadTabData(tab) {
    try {
      const endpoints = {
        documents: `/students/${id}/documents`,
        medical: `/students/${id}/medical`,
        discipline: `/students/${id}/discipline`,
        achievements: `/students/${id}/achievements`,
        history: `/students/${id}/status-history`,
        enrollments: `/students/${id}/enrollments`,
      };
      if (endpoints[tab]) {
        const res = await api.get(endpoints[tab]);
        const setters = {
          documents: setDocuments,
          medical: setMedical,
          discipline: setDiscipline,
          achievements: setAchievements,
          history: setStatusHistory,
          enrollments: setEnrollments,
        };
        setters[tab](res.data || []);
      }
    } catch {}
  }

  function switchTab(tab) {
    setActiveTab(tab);
    loadTabData(tab);
  }

  async function openProfile() {
    setProfileOpen(true);
    if (!ledger) {
      try {
        const res = await api.get(`/fees/ledger/${id}`);
        setLedger(res.data);
      } catch {}
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (loadError) return <div className="p-8 text-red-500">{loadError}</div>;
  if (!student) return <div className="p-8 text-muted-foreground">Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button type="button" onClick={openProfile} className="relative shrink-0 group cursor-pointer">
          <StudentAvatar student={student} className="w-14 h-14 text-lg ring-4 ring-border" />
          <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{student.first_name} {student.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.student_number} &middot; {student.class_name || "No class"} &middot;
            <Badge variant={student.status === "active" ? "success" : "secondary"} className="ml-1">
              {student.status}
            </Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(`/api/pdf/report-card/${id}`, "_blank")}>
          <Download className="h-4 w-4 mr-1" /> Report Card
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(`/api/pdf/invoice/${id}`, "_blank")}>
          <Download className="h-4 w-4 mr-1" /> Invoice
        </Button>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center text-center gap-3">
            <StudentAvatar student={student} className="w-24 h-24 text-3xl ring-8 ring-muted" />
            <div>
              <p className="text-lg font-bold">{student.first_name} {student.last_name}</p>
              <p className="text-sm text-muted-foreground">
                {student.student_number} &middot; {student.class_name || "No class"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={12} /> Contact</p>
              <p className="font-medium mt-0.5">{student.phone || student.emergency_contact || "—"}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen size={12} /> Class</p>
              <p className="font-medium mt-0.5">{student.class_name || "—"}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><UserRound size={12} /> Father</p>
              <p className="font-medium mt-0.5">{student.father_name || "—"}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Mother</p>
              <p className="font-medium mt-0.5">{student.mother_name || "—"}</p>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><UserRound size={12} /> Guardians</p>
            <div className="mt-1 space-y-1">
              {(!student.guardians || student.guardians.length === 0) && (
                <p className="text-sm text-muted-foreground">No guardians linked</p>
              )}
              {(student.guardians || []).map((g) => (
                <p key={g.id} className="text-sm">
                  <span className="font-medium">{g.first_name} {g.last_name}</span>
                  <span className="text-muted-foreground"> · {g.relationship}</span>
                  {g.phone ? <span className="text-muted-foreground"> · {g.phone}</span> : null}
                </p>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${ledger && Number(ledger.total_balance) > 0 ? "border-red-200 bg-red-50" : ""}`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet size={12} /> Fee Status</p>
            {!ledger ? (
              <p className="text-sm text-muted-foreground mt-0.5">Loading fee status…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                <div><p className="text-sm font-bold">{Number(ledger.total_owed).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Owed</p></div>
                <div><p className="text-sm font-bold text-green-600">{Number(ledger.total_paid).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Paid</p></div>
                <div>
                  <p className={`text-sm font-bold ${Number(ledger.total_balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                    {Number(ledger.total_balance).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Balance</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Guardians</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(!student.guardians || student.guardians.length === 0) && (
              <p className="text-sm text-muted-foreground">No guardians linked</p>
            )}
            {(student.guardians || []).map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {g.first_name} {g.last_name}
                    {g.is_primary && <Badge variant="success" className="ml-2">Primary</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {g.relationship}{g.education_level ? ` · ${g.education_level}` : ""}{g.email ? ` · ${g.email}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollment</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Enrolled:</span> {student.enrollment_date ? (!isNaN(new Date(student.enrollment_date).getTime()) ? new Date(student.enrollment_date).toLocaleDateString() : "—") : "—"}</p>
            <p><span className="text-muted-foreground">Student #:</span> {student.student_number || "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {student.phone || student.emergency_contact || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Emergency Contact</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{student.emergency_contact || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Demographics</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Full Name:</span> {student.first_name} {student.father_name || ""} {student.grandfather_name || ""} {student.last_name}</p>
            <p><span className="text-muted-foreground">Mother's Name:</span> {student.mother_name || "—"}</p>
            <p><span className="text-muted-foreground">DOB:</span> {student.date_of_birth ? (!isNaN(new Date(student.date_of_birth).getTime()) ? new Date(student.date_of_birth).toLocaleDateString() : "—") : "—"}</p>
            <p><span className="text-muted-foreground">Gender:</span> {student.gender || "—"}</p>
            <p><span className="text-muted-foreground">Nationality:</span> {student.nationality || "—"}</p>
            <p><span className="text-muted-foreground">Country of Birth:</span> {student.country_of_birth || "—"}</p>
            <p><span className="text-muted-foreground">National ID:</span> {student.national_id || "—"}</p>
            <p><span className="text-muted-foreground">Economic Status:</span> {student.economic_status || "—"}</p>
            <p><span className="text-muted-foreground">Disability:</span> {student.disability ? (student.disability_type || "Yes") : "No"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Addresses</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Residence:</span> {[student.woreda_of_residence, student.zone_of_residence, student.region_of_residence].filter(Boolean).join(", ") || "—"}</p>
            <p><span className="text-muted-foreground">Birth:</span> {[student.woreda_of_birth, student.zone_of_birth, student.region_of_birth].filter(Boolean).join(", ") || "—"}</p>
            <p><span className="text-muted-foreground">Kebele:</span> {student.kebele || "—"}</p>
            <p><span className="text-muted-foreground">Location Type:</span> {student.location_type || "—"}</p>
            <p><span className="text-muted-foreground">Home Address:</span> {student.home_address || "—"}</p>
            <p><span className="text-muted-foreground">Parent Status:</span> {student.parent_status || "—"}</p>
            <p><span className="text-muted-foreground">Family Head:</span> {student.family_head_gender || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "documents" && <DocumentsTab documents={documents} studentId={id} newDoc={newDoc} setNewDoc={setNewDoc} onReload={() => loadTabData("documents")} />}
      {activeTab === "medical" && <MedicalTab medical={medical} studentId={id} newMed={newMed} setNewMed={setNewMed} onReload={() => loadTabData("medical")} />}
      {activeTab === "discipline" && <DisciplineTab records={discipline} studentId={id} newDisc={newDisc} setNewDisc={setNewDisc} onReload={() => loadTabData("discipline")} />}
      {activeTab === "achievements" && <AchievementsTab achievements={achievements} studentId={id} newAch={newAch} setNewAch={setNewAch} onReload={() => loadTabData("achievements")} />}
      {activeTab === "history" && <HistoryTab history={statusHistory} />}
      {activeTab === "enrollments" && <EnrollmentTab studentId={id} enrollments={enrollments} onReload={() => loadTabData("enrollments")} />}
    </div>
  );
}

function DocumentsTab({ documents, studentId, newDoc, setNewDoc, onReload }) {
  async function addDoc() {
    try {
      await api.post(`/students/${studentId}/documents`, newDoc);
      setNewDoc({ type: "other", name: "", file_url: "" });
      onReload();
    } catch {}
  }
  return (
    <Card>
      <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div>
            <Label>Type</Label>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}>
              <option value="birth_certificate">Birth Certificate</option>
              <option value="report_card">Report Card</option>
              <option value="photo">Photo</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} placeholder="Document name" />
          </div>
          <Button onClick={addDoc}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.type}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/students/${studentId}/documents/${d.id}`); onReload(); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicalTab({ medical, studentId, newMed, setNewMed, onReload }) {
  async function saveMedical() {
    try {
      await api.put(`/students/${studentId}/medical`, newMed);
      onReload();
    } catch {}
  }
  return (
    <Card>
      <CardHeader><CardTitle>Medical Information</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Blood Group</Label>
            <Input value={newMed.blood_group} onChange={(e) => setNewMed({ ...newMed, blood_group: e.target.value })} placeholder="e.g. O+" />
          </div>
          <div>
            <Label>Allergies</Label>
            <Input value={newMed.allergies} onChange={(e) => setNewMed({ ...newMed, allergies: e.target.value })} placeholder="e.g. Peanuts" />
          </div>
          <div className="col-span-2">
            <Label>Chronic Conditions</Label>
            <Input value={newMed.chronic_conditions} onChange={(e) => setNewMed({ ...newMed, chronic_conditions: e.target.value })} placeholder="e.g. Asthma" />
          </div>
        </div>
        {medical && (
          <div className="bg-muted rounded-md p-3 text-sm">
            <p><strong>Current:</strong> {medical.blood_group && `${medical.blood_group} | `}{medical.allergies || "No allergies"}{medical.chronic_conditions && ` | ${medical.chronic_conditions}`}</p>
          </div>
        )}
        <Button onClick={saveMedical}>Save Medical Info</Button>
      </CardContent>
    </Card>
  );
}

function DisciplineTab({ records, studentId, newDisc, setNewDisc, onReload }) {
  async function addRecord() {
    try {
      await api.post(`/students/${studentId}/discipline`, newDisc);
      setNewDisc({ incident_type: "misconduct", description: "" });
      onReload();
    } catch {}
  }
  const statusVariant = (s) => s === "resolved" || s === "dismissed" ? "secondary" : "destructive";
  return (
    <Card>
      <CardHeader><CardTitle>Discipline Records</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div>
            <Label>Type</Label>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDisc.incident_type} onChange={(e) => setNewDisc({ ...newDisc, incident_type: e.target.value })}>
              <option value="lateness">Lateness</option>
              <option value="misconduct">Misconduct</option>
              <option value="bullying">Bullying</option>
              <option value="cheating">Cheating</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={newDisc.description} onChange={(e) => setNewDisc({ ...newDisc, description: e.target.value })} placeholder="Describe incident" />
          </div>
          <Button onClick={addRecord}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discipline records</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="border rounded-md p-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{r.incident_type}</p>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
                <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AchievementsTab({ achievements, studentId, newAch, setNewAch, onReload }) {
  async function addAchievement() {
    try {
      await api.post(`/students/${studentId}/achievements`, newAch);
      setNewAch({ type: "academic", title: "", description: "", achieved_date: "" });
      onReload();
    } catch {}
  }
  return (
    <Card>
      <CardHeader><CardTitle>Achievements & Awards</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <Label>Type</Label>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newAch.type} onChange={(e) => setNewAch({ ...newAch, type: e.target.value })}>
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="arts">Arts</option>
              <option value="behavior">Behavior</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={newAch.title} onChange={(e) => setNewAch({ ...newAch, title: e.target.value })} placeholder="Award title" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={newAch.achieved_date} onChange={(e) => setNewAch({ ...newAch, achieved_date: e.target.value })} />
          </div>
          <Button onClick={addAchievement}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No achievements recorded</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="border rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{a.type}{a.achieved_date ? ` · ${a.achieved_date}` : ""}</p>
                    {a.description && <p className="text-xs mt-1">{a.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={async () => { await api.delete(`/students/${studentId}/achievements/${a.id}`); onReload(); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryTab({ history }) {
  return (
    <Card>
      <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status changes recorded</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 border-l-2 border-primary pl-3 py-1">
                <div>
                  <p className="text-sm">
                    {h.from_status || "—"} <span className="text-muted-foreground">→</span> {h.to_status}
                  </p>
                  <p className="text-xs text-muted-foreground">{!isNaN(new Date(h.created_at).getTime()) ? new Date(h.created_at).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnrollmentTab({ studentId, enrollments, onReload }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    academic_year_id: "", class_id: "", grade_level: "", section: "",
    admission_category: "Promoted", admission_modality: "Regular", education_stream: "",
    cte_field_1: "", cte_field_2: "", num_textbooks: "", instructional_language: "",
    school_feeding: false, food_ration_home: false, meals_per_week: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/academics/academic-years").then((r) => setAcademicYears(r.data || [])).catch(() => {});
    api.get("/classes", { params: { limit: 500 } }).then((r) => setClasses(r.data || [])).catch(() => {});
  }, []);

  function buildPayload() {
    const p = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === null || v === undefined) continue;
      if (k === "meals_per_week" || k === "num_textbooks") p[k] = parseInt(v, 10);
      else p[k] = v;
    }
    return p;
  }

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post(`/students/${studentId}/enrollments`, buildPayload());
      setOpen(false);
      setForm({
        academic_year_id: "", class_id: "", grade_level: "", section: "",
        admission_category: "Promoted", admission_modality: "Regular", education_stream: "",
        cte_field_1: "", cte_field_2: "", num_textbooks: "", instructional_language: "",
        school_feeding: false, food_ration_home: false, meals_per_week: "",
      });
      onReload();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Enrollments</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Enrollment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Enrollment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}>
                    <option value="">Select year</option>
                    {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade Level</Label>
                    <Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 1 or Nursery" />
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Admission Category</Label>
                    <Input value={form.admission_category} onChange={(e) => setForm({ ...form, admission_category: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Admission Modality</Label>
                    <Input value={form.admission_modality} onChange={(e) => setForm({ ...form, admission_modality: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Education Stream</Label>
                    <Input value={form.education_stream} onChange={(e) => setForm({ ...form, education_stream: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Instructional Language</Label>
                    <Input value={form.instructional_language} onChange={(e) => setForm({ ...form, instructional_language: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label># Textbooks</Label>
                    <Input type="number" value={form.num_textbooks} onChange={(e) => setForm({ ...form, num_textbooks: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Meals / Week</Label>
                    <Input type="number" value={form.meals_per_week} onChange={(e) => setForm({ ...form, meals_per_week: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTE Field 1</Label>
                    <Input value={form.cte_field_1} onChange={(e) => setForm({ ...form, cte_field_1: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>CTE Field 2</Label>
                    <Input value={form.cte_field_2} onChange={(e) => setForm({ ...form, cte_field_2: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-4 pt-2 col-span-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.school_feeding} onChange={(e) => setForm({ ...form, school_feeding: e.target.checked })} className="h-4 w-4" /> School Feeding</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.food_ration_home} onChange={(e) => setForm({ ...form, food_ration_home: e.target.checked })} className="h-4 w-4" /> Food Ration Home</label>
                  </div>
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Add Enrollment"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments recorded</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((en) => (
              <div key={en.id} className="border rounded-md p-3 flex items-start justify-between">
                <div className="text-sm">
                  <p className="font-medium">{en.academic_year_name || en.academic_year_id} {en.grade_level ? `· Grade ${en.grade_level}${en.section ? ` ${en.section}` : ""}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {en.class_name || ""}
                    {en.admission_category ? ` · ${en.admission_category}` : ""}
                    {en.admission_modality ? ` / ${en.admission_modality}` : ""}
                    {en.instructional_language ? ` · ${en.instructional_language}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {en.num_textbooks ? `${en.num_textbooks} textbooks` : ""}
                    {en.meals_per_week ? ` · ${en.meals_per_week} meals/week` : ""}
                    {en.school_feeding ? " · School feeding" : ""}
                    {en.food_ration_home ? " · Food ration home" : ""}
                    {en.education_stream ? ` · Stream: ${en.education_stream}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => { if (confirm("Delete this enrollment?")) { await api.delete(`/students/${studentId}/enrollments/${en.id}`); onReload(); } }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
