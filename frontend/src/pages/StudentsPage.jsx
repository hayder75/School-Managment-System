import { useState } from "react";
import { useDebouncedValue } from "../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, usePromoteStudents, useEnrollmentStats } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useUsers } from "../hooks/useUsers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { TableSkeleton, CardSkeleton } from "../components/ui/skeleton";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { useI18n } from "../i18n/I18nContext";
import { Plus, Search, GraduationCap, Users, BookOpen, ExternalLink } from "lucide-react";

export default function StudentsPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ from_class_id: "", to_class_id: "" });
  const [form, setForm] = useState({
    user_id: "", class_id: "", student_number: "", emergency_contact: "",
    father_name: "", grandfather_name: "", mother_name: "", date_of_birth: "", gender: "",
    nationality: "", country_of_birth: "", region_of_residence: "", zone_of_residence: "", woreda_of_residence: "",
    region_of_birth: "", zone_of_birth: "", woreda_of_birth: "", kebele: "", location_type: "",
    disability: false, disability_type: "", economic_status: "", national_id: "", parent_status: "",
    family_head_gender: "", home_address: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, isLoading } = useStudents({ page, limit: 20, search: debouncedSearch || undefined, class_id: classFilter || undefined, status: statusFilter || undefined });
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: usersData } = useUsers({ role: "student", limit: 200 });
  const { data: statsData } = useEnrollmentStats();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const promoteStudents = usePromoteStudents();
  const students = data?.data || [];
  const navigate = useNavigate();
  const meta = data?.meta || {};
  const classes = classesData?.data || [];
  const users = usersData?.data || [];
  const stats = statsData?.data || {};

  function resetForm() {
    setForm({
      user_id: "", class_id: "", student_number: "", emergency_contact: "",
      father_name: "", grandfather_name: "", mother_name: "", date_of_birth: "", gender: "",
      nationality: "", country_of_birth: "", region_of_residence: "", zone_of_residence: "", woreda_of_residence: "",
      region_of_birth: "", zone_of_birth: "", woreda_of_birth: "", kebele: "", location_type: "",
      disability: false, disability_type: "", economic_status: "", national_id: "", parent_status: "",
      family_head_gender: "", home_address: "",
    });
    setEditing(null);
  }

  function buildPayload() {
    const p = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === null || v === undefined) continue;
      p[k] = v;
    }
    if (!p.disability) { delete p.disability; delete p.disability_type; }
    if (form.date_of_birth) {
      const d = new Date(form.date_of_birth);
      if (!isNaN(d.getTime())) p.date_of_birth = d.toISOString();
    }
    return p;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      if (editing) {
        await updateStudent.mutateAsync({ id: editing.id, data: buildPayload() });
      } else {
        await createStudent.mutateAsync(buildPayload());
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function handleEdit(student) {
    setEditing(student);
    setForm({
      user_id: student.user_id, class_id: student.class_id, student_number: student.student_number || "",
      emergency_contact: student.emergency_contact || "",
      father_name: student.father_name || "", grandfather_name: student.grandfather_name || "",
      mother_name: student.mother_name || "", date_of_birth: (student.date_of_birth || "").slice(0, 10) || "", gender: student.gender || "",
      nationality: student.nationality || "", country_of_birth: student.country_of_birth || "",
      region_of_residence: student.region_of_residence || "", zone_of_residence: student.zone_of_residence || "",
      woreda_of_residence: student.woreda_of_residence || "", region_of_birth: student.region_of_birth || "",
      zone_of_birth: student.zone_of_birth || "", woreda_of_birth: student.woreda_of_birth || "",
      kebele: student.kebele || "", location_type: student.location_type || "",
      disability: !!student.disability, disability_type: student.disability_type || "",
      economic_status: student.economic_status || "", national_id: student.national_id || "",
      parent_status: student.parent_status || "", family_head_gender: student.family_head_gender || "",
      home_address: student.home_address || "",
    });
    setOpen(true);
  }

  async function handlePromote(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await promoteStudents.mutateAsync(promoteForm);
      setPromoteOpen(false);
      setPromoteForm({ from_class_id: "", to_class_id: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  if (isLoading) return <div className="space-y-4 p-8"><CardSkeleton /><TableSkeleton rows={8} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Students")}</h1>
          <p className="text-muted-foreground">{t("Manage student records")}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">{t("Promote Students")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("Promote Students")}</DialogTitle></DialogHeader>
              <form onSubmit={handlePromote} className="space-y-4">
                {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                <div className="space-y-2">
                  <Label>{t("From Class")}</Label>
                  <Select value={promoteForm.from_class_id} onValueChange={(v) => setPromoteForm({ ...promoteForm, from_class_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="from_class_id" />
                <div className="space-y-2">
                  <Label>{t("To Class")}</Label>
                  <Select value={promoteForm.to_class_id} onValueChange={(v) => setPromoteForm({ ...promoteForm, to_class_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="to_class_id" />
                <Button type="submit" className="w-full">{t("Promote")}</Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
          {isAdmin && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t("Add Student")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? t("Edit Student") : t("Add Student")}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                <div className="space-y-2">
                  <Label>{t("User (Student Account)")}</Label>
                  <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select user")} /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="user_id" />
                <div className="space-y-2">
                  <Label>{t("Class")}</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="class_id" />
                <div className="space-y-2">
                  <Label>{t("Student Number")}</Label>
                  <Input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="student_number" />
                <div className="space-y-2">
                  <Label>{t("Emergency contact")}</Label>
                  <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="emergency_contact" />
                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold">{t("Personal / Demographics")}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label>{t("Father's Name")}</Label>
                      <Input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Grandfather's Name")}</Label>
                      <Input value={form.grandfather_name} onChange={(e) => setForm({ ...form, grandfather_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Mother's Name")}</Label>
                      <Input value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Date of Birth")}</Label>
                      <EthiopianDateInput value={form.date_of_birth} onChange={(iso) => setForm({ ...form, date_of_birth: iso })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Gender")}</Label>
                      <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                        <SelectTrigger><SelectValue placeholder={t("Select gender")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t("Male")}</SelectItem>
                          <SelectItem value="female">{t("Female")}</SelectItem>
                          <SelectItem value="other">{t("Other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Nationality")}</Label>
                      <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="Ethiopian" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Country of Birth")}</Label>
                      <Input value={form.country_of_birth} onChange={(e) => setForm({ ...form, country_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Economic Status")}</Label>
                      <Select value={form.economic_status} onValueChange={(v) => setForm({ ...form, economic_status: v })}>
                        <SelectTrigger><SelectValue placeholder={t("Select status")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("National ID")}</Label>
                      <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Parent Status")}</Label>
                      <Input value={form.parent_status} onChange={(e) => setForm({ ...form, parent_status: e.target.value })} placeholder="e.g. both_alive" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Family Head Gender")}</Label>
                      <Select value={form.family_head_gender} onValueChange={(v) => setForm({ ...form, family_head_gender: v })}>
                        <SelectTrigger><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t("Male")}</SelectItem>
                          <SelectItem value="female">{t("Female")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Location Type")}</Label>
                      <Select value={form.location_type} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                        <SelectTrigger><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urban">{t("Urban")}</SelectItem>
                          <SelectItem value="rural">{t("Rural")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kebele</Label>
                      <Input value={form.kebele} onChange={(e) => setForm({ ...form, kebele: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" checked={form.disability} onChange={(e) => setForm({ ...form, disability: e.target.checked })} className="h-4 w-4" />
                      <Label className="cursor-pointer">{t("Has Disability")}</Label>
                    </div>
                    {form.disability && (
                      <div className="space-y-2">
                        <Label>{t("Disability Type")}</Label>
                        <Input value={form.disability_type} onChange={(e) => setForm({ ...form, disability_type: e.target.value })} />
                      </div>
                    )}
                  </div>
                  <Label className="text-sm font-semibold mt-4 block">{t("Address of Residence")}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Input value={form.region_of_residence} onChange={(e) => setForm({ ...form, region_of_residence: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Input value={form.zone_of_residence} onChange={(e) => setForm({ ...form, zone_of_residence: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Woreda</Label>
                      <Input value={form.woreda_of_residence} onChange={(e) => setForm({ ...form, woreda_of_residence: e.target.value })} />
                    </div>
                  </div>
                  <Label className="text-sm font-semibold mt-4 block">{t("Address of Birth")}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Input value={form.region_of_birth} onChange={(e) => setForm({ ...form, region_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Input value={form.zone_of_birth} onChange={(e) => setForm({ ...form, zone_of_birth: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Woreda</Label>
                      <Input value={form.woreda_of_birth} onChange={(e) => setForm({ ...form, woreda_of_birth: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>{t("Home Address")}</Label>
                    <Input value={form.home_address} onChange={(e) => setForm({ ...form, home_address: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full">{editing ? t("Update") : t("Create")}</Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("Total Students")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.total || meta.total || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("Classes")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(stats.byClass || []).length || classes.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{t("Active")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{students.filter(s => s.status === "active").length || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t("Search students...")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("All classes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All classes")}</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("All status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All status")}</SelectItem>
                <SelectItem value="active">{t("Active")}</SelectItem>
                <SelectItem value="transferred">{t("Transferred")}</SelectItem>
                <SelectItem value="dropped">{t("Dropped")}</SelectItem>
                <SelectItem value="graduated">{t("Graduated")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: student cards */}
          <div className="md:hidden space-y-2">
            {students.length === 0 && (
              <p className="text-center p-6 text-muted-foreground text-sm">{t("No students found")}</p>
            )}
            {students.map((s) => (
              <div key={s.id} className="rounded-xl border p-3 active:bg-muted/50" onClick={() => navigate(`/students/${s.id}`)}>
                <div className="flex items-center gap-3">
                  <StudentAvatar student={s} className="w-10 h-10 text-xs shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.student_number || "—"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] shrink-0 ${s.status === "active" ? "bg-green-100 text-green-800" : s.status === "graduated" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{t(s.status)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.class_name || t("No class")}</span>
                  {isAdmin ? (
                    <span className="space-x-3">
                      <button className="text-primary font-medium" onClick={(e) => { e.stopPropagation(); handleEdit(s); }}>{t("Edit")}</button>
                      <button className="text-red-500 font-medium" onClick={(e) => { e.stopPropagation(); if (confirm(t("Delete this student?"))) deleteStudent.mutate(s.id); }}>{t("Delete")}</button>
                    </span>
                  ) : (
                    <span className="text-primary font-medium">{t("View")} →</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border">
            <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{t("Student #")}</th>
                  <th className="text-left p-3 font-medium">{t("Name")}</th>
                  <th className="text-left p-3 font-medium">{t("Email")}</th>
                  <th className="text-left p-3 font-medium">{t("Class")}</th>
                  <th className="text-left p-3 font-medium">{t("Status")}</th>
                  <th className="text-right p-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && <tr><td colSpan={6} className="text-center p-6 text-muted-foreground">{t("No students found")}</td></tr>}
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3">{s.student_number || "—"}</td>
                    <td className="p-3 font-medium">
                      <button className="hover:text-primary flex items-center gap-2 text-left" onClick={() => navigate(`/students/${s.id}`)}>
                        <StudentAvatar student={s} className="w-8 h-8 text-xs" />
                        <span className="hover:underline">{s.first_name} {s.last_name}</span>
                      </button>
                    </td>
                    <td className="p-3">{s.email}</td>
                    <td className="p-3">{s.class_name || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "active" ? "bg-green-100 text-green-800" : s.status === "graduated" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{t(s.status)}</span></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${s.id}`)}><ExternalLink className="h-3 w-3 mr-1" />{t("View")}</Button>
                      {isAdmin && <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>{t("Edit")}</Button>}
                      {isAdmin && <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm(t("Delete this student?"))) deleteStudent.mutate(s.id); }}>{t("Delete")}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{t("Page")} {meta.page} {t("of")} {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t("Previous")}</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("Next")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
