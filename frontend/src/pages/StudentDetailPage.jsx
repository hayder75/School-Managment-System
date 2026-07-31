import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Plus, Trash2, FileText, Stethoscope, AlertTriangle, Award, History, Download } from "lucide-react";

const TABS = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "medical", label: "Medical", icon: Stethoscope },
  { key: "discipline", label: "Discipline", icon: AlertTriangle },
  { key: "achievements", label: "Achievements", icon: Award },
  { key: "history", label: "Status History", icon: History },
];

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [loading, setLoading] = useState(true);

  const [documents, setDocuments] = useState([]);
  const [medical, setMedical] = useState(null);
  const [discipline, setDiscipline] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);

  const [newDoc, setNewDoc] = useState({ type: "other", name: "", file_url: "" });
  const [newMed, setNewMed] = useState({ blood_group: "", allergies: "", chronic_conditions: "" });
  const [newDisc, setNewDisc] = useState({ incident_type: "misconduct", description: "" });
  const [newAch, setNewAch] = useState({ type: "academic", title: "", description: "", achieved_date: "" });

  useEffect(() => {
    loadStudent();
  }, [id]);

  async function loadStudent() {
    setLoading(true);
    try {
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
      loadTabData("documents");
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
      };
      if (endpoints[tab]) {
        const res = await api.get(endpoints[tab]);
        const setters = {
          documents: setDocuments,
          medical: setMedical,
          discipline: setDiscipline,
          achievements: setAchievements,
          history: setStatusHistory,
        };
        setters[tab](res.data || []);
      }
    } catch {}
  }

  function switchTab(tab) {
    setActiveTab(tab);
    loadTabData(tab);
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!student) return <div className="p-8 text-muted-foreground">Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
                  <p className="text-xs text-muted-foreground capitalize">{g.relationship}{g.email ? ` · ${g.email}` : ""}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollment</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Enrolled:</span> {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : "—"}</p>
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
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
