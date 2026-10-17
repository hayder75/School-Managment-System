import { fullName } from "../lib/fullName";
import { useState } from "react";
import { useDebouncedValue } from "../hooks/useDebounce";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useParents, useParent, useLinkParent, useUnlinkParent, useUpdateLink } from "../hooks/useParents";
import { useStudents, useUnlinkedStudents } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useToast } from "../store/toast";
import api from "../lib/api";
import EntitySearch from "../components/ui/EntitySearch";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Link, Unlink, UserPlus, Link2 } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

async function searchParents(q) {
  const r = await api.get("/parents", { params: { search: q || undefined, limit: 20 } });
  return (r.data || []).map((p) => ({
    value: p.id,
    label: [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ") || p.guardian_name || p.phone || "Parent",
    sub: p.phone || "",
  }));
}

function UnlinkedSection() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const { data, isLoading, refetch } = useUnlinkedStudents({ search: search || undefined, class_id: classId === "all" ? undefined : classId });
  const { data: classesData } = useClasses({ limit: 200 });
  const [student, setStudent] = useState(null);
  const [mode, setMode] = useState("new");
  const [parentId, setParentId] = useState("");
  const [parentLabel, setParentLabel] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", relationship: "guardian" });
  const [busy, setBusy] = useState(false);

  const rows = data?.data || [];
  const classes = classesData?.data || [];

  function openFor(s) {
    setStudent(s); setMode("new"); setParentId(""); setParentLabel("");
    setForm({ first_name: "", last_name: "", phone: "", relationship: "guardian" });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { student_id: student.id, relationship: form.relationship };
      if (mode === "existing") {
        if (!parentId) throw new Error(t("Select a parent"));
        body.parent_id = parentId;
      } else {
        body.first_name = form.first_name; body.last_name = form.last_name; body.phone = form.phone;
      }
      await api.post("/parents/guardian", body);
      toast(t("Guardian linked"), "success");
      setStudent(null);
      refetch();
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Failed to link"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("Unlinked Students")}</h2>
          <p className="text-sm text-muted-foreground">{t("Students without a guardian — link one so they can be contacted")}</p>
        </div>
        <Badge variant={rows.length ? "warning" : "success"}>{rows.length} {t("students")}</Badge>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("Search name, student ID…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-56"><SelectValue placeholder={t("All classes")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All classes")}</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>{t("Student")}</TableHead><TableHead>{t("Student ID")}</TableHead>
              <TableHead>{t("Class")}</TableHead><TableHead>{t("Gender")}</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ")}</TableCell>
                  <TableCell>{s.student_number || "—"}</TableCell>
                  <TableCell>{s.class_name || "—"} <span className="text-muted-foreground text-xs">({s.level_group || ""})</span></TableCell>
                  <TableCell className="capitalize">{s.gender || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => openFor(s)}><UserPlus className="h-4 w-4 mr-1" />{t("Link guardian")}</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-6">{t("Everyone has a guardian linked.")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!student} onOpenChange={(o) => !o && setStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Link guardian")} — {student && [student.first_name, student.last_name].filter(Boolean).join(" ")}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>{t("New guardian")}</Button>
              <Button type="button" variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>{t("Existing parent")}</Button>
            </div>
            {mode === "existing" ? (
              <div className="space-y-2">
                <Label>{t("Parent")}</Label>
                <EntitySearch value={parentId} valueLabel={parentLabel} onChange={(id, o) => { setParentId(id); setParentLabel(o.label); }} fetchOptions={searchParents} placeholder={t("Search parent by name or phone…")} searchPlaceholder={t("Type a name or phone…")} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("First name")}</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t("Last name")}</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                <div className="space-y-2 col-span-2"><Label>{t("Phone")} *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09… / 9… / 2519…" /></div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("Relationship")}</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{t("Father")}</SelectItem>
                  <SelectItem value="mother">{t("Mother")}</SelectItem>
                  <SelectItem value="guardian">{t("Guardian")}</SelectItem>
                  <SelectItem value="other">{t("Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStudent(null)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={busy}><Link2 className="h-4 w-4 mr-1" />{t("Link")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ParentsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [linkForm, setLinkForm] = useState({ student_id: "", relationship: "guardian", is_primary: false, education_level: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, isLoading } = useParents({ page, limit: 20, search: debouncedSearch || undefined });
  const { data: parentDetail } = useParent(selectedParent?.id);
  const { data: studentsData } = useStudents({ limit: 200 });
  const linkParent = useLinkParent();
  const unlinkParent = useUnlinkParent();
  const updateLink = useUpdateLink();

  const parents = data?.data || [];
  const meta = data?.meta || {};
  const students = studentsData?.data || [];

  async function handleLink(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await linkParent.mutateAsync({ parent_id: selectedParent.id, ...linkForm });
      setLinkOpen(false);
      setLinkForm({ student_id: "", relationship: "guardian", is_primary: false, education_level: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Parents")}</h1>
          <p className="text-muted-foreground">{t("Manage parents and guardians")}</p>
        </div>
      </div>

      <Tabs defaultValue="parents">
        <TabsList>
          <TabsTrigger value="parents">{t("Parents")}</TabsTrigger>
          <TabsTrigger value="unlinked">{t("Unlinked Students")}</TabsTrigger>
        </TabsList>

        <TabsContent value="parents" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder={t("Search name, phone, or child ID…")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {parents.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">{t("No parents found")}</p>}
                    {parents.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedParent(p)}
                        className={`w-full text-left p-3 text-sm hover:bg-muted transition-colors ${selectedParent?.id === p.id ? "bg-muted" : ""}`}
                      >
                        <p className="font-medium">{[p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ") || p.guardian_name || p.phone}</p>
                        <p className="text-xs text-muted-foreground">{p.phone || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                        {p.children_names && (
                          <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground/70">{t("Students")}:</span> {p.children_names}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
                {meta.totalPages > 1 && (
                  <CardContent className="flex justify-between pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("Prev")}</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>{t("Next")}</Button>
                  </CardContent>
                )}
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{selectedParent ? ([selectedParent.first_name, selectedParent.middle_name, selectedParent.last_name].filter(Boolean).join(" ") || selectedParent.guardian_name || selectedParent.phone) : t("Select a Parent")}</CardTitle>
                  {selectedParent && (
                    <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Link className="h-4 w-4 mr-2" />{t("Link Student")}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{t("Link Student to Parent")}</DialogTitle></DialogHeader>
                        <form onSubmit={handleLink} className="space-y-4">
                          {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                          <div className="space-y-2">
                            <Label>{t("Student")}</Label>
                            <Select value={linkForm.student_id} onValueChange={(v) => setLinkForm({ ...linkForm, student_id: v })}>
                              <SelectTrigger><SelectValue placeholder={t("Select student")} /></SelectTrigger>
                              <SelectContent>
                                {students.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <FieldError errors={fieldErrors} field="student_id" />
                          <div className="space-y-2">
                            <Label>{t("Relationship")}</Label>
                            <Select value={linkForm.relationship} onValueChange={(v) => setLinkForm({ ...linkForm, relationship: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="father">{t("Father")}</SelectItem>
                                <SelectItem value="mother">{t("Mother")}</SelectItem>
                                <SelectItem value="guardian">{t("Guardian")}</SelectItem>
                                <SelectItem value="other">{t("Other")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FieldError errors={fieldErrors} field="relationship" />
                          <div className="space-y-2">
                            <Label>{t("Education Level (optional)")}</Label>
                            <Input value={linkForm.education_level} onChange={(e) => setLinkForm({ ...linkForm, education_level: e.target.value })} placeholder={t("e.g. Grade 8, Diploma")} />
                          </div>
                          <FieldError errors={fieldErrors} field="education_level" />
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={linkForm.is_primary} onChange={(e) => setLinkForm({ ...linkForm, is_primary: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#538a8d] focus:ring-0 cursor-pointer" />
                            <span>{t("Set as primary guardian")}</span>
                          </label>
                          <FieldError errors={fieldErrors} field="is_primary" />
                          <Button type="submit" className="w-full">{t("Link")}</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedParent ? (
                    <p className="text-muted-foreground text-center py-12">{t("Select a parent from the list to view details")}</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label className="text-xs">{t("Email")}</Label><p className="text-sm">{selectedParent.email}</p></div>
                        <div><Label className="text-xs">{t("Phone")}</Label><p className="text-sm">{selectedParent.phone || "—"}</p></div>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm mb-2">{t("Linked Children")}</h3>
                        <div className="rounded-md border">
                          <div className="overflow-x-auto -mx-px"><table className="w-full text-sm">
                            <thead><tr className="border-b bg-muted/50"><th className="text-left p-2 font-medium">{t("Name")}</th><th className="text-left p-2 font-medium">{t("Student #")}</th><th className="text-left p-2 font-medium">{t("Relationship")}</th><th className="text-left p-2 font-medium">{t("Primary")}</th><th className="text-right p-2 font-medium">{t("Actions")}</th></tr></thead>
                            <tbody>
                              {(!parentDetail?.data?.children || parentDetail.data.children.length === 0) && (
                                <tr><td colSpan={5} className="text-center p-4 text-muted-foreground">{t("No children linked")}</td></tr>
                              )}
                              {(parentDetail?.data?.children || []).map((child) => (
                                <tr key={child.student_id} className="border-b last:border-0">
                                  <td className="p-2">{[child.first_name, child.middle_name, child.last_name].filter(Boolean).join(" ")}</td>
                                  <td className="p-2">{child.student_number || "—"}</td>
                                  <td className="p-2 capitalize">{child.relationship}</td>
                                  <td className="p-2">
                                    <Button
                                      variant={child.is_primary ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        if (child.is_primary) return;
                                        if (confirm(t("Set this parent as primary guardian for this child?"))) {
                                          updateLink.mutate({ id: child.link_id, is_primary: true });
                                        }
                                      }}
                                    >
                                      {child.is_primary ? t("Primary") : t("Set primary")}
                                    </Button>
                                  </td>
                                  <td className="p-2 text-right">
                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm(t("Unlink this child?"))) unlinkParent.mutate(child.link_id); }}>
                                      <Unlink className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="unlinked" className="mt-4">
          <UnlinkedSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
