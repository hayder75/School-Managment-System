import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useParents, useParent, useLinkParent, useUnlinkParent, useUpdateLink } from "../hooks/useParents";
import { useStudents } from "../hooks/useStudents";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Plus, Link, Unlink, Users } from "lucide-react";

export default function ParentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [linkForm, setLinkForm] = useState({ student_id: "", relationship: "guardian", is_primary: false });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, isLoading } = useParents({ page, limit: 20, search: search || undefined });
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
      setLinkForm({ student_id: "", relationship: "guardian", is_primary: false });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parents</h1>
          <p className="text-muted-foreground">Manage parents and guardians</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search parents..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {parents.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No parents found</p>}
                {parents.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedParent(p)}
                    className={`w-full text-left p-3 text-sm hover:bg-muted transition-colors ${selectedParent?.id === p.id ? "bg-muted" : ""}`}
                  >
                    <p className="font-medium">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </button>
                ))}
              </div>
            </CardContent>
            {meta.totalPages > 1 && (
              <CardContent className="flex justify-between pt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : "Select a Parent"}</CardTitle>
              {selectedParent && (
                <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Link className="h-4 w-4 mr-2" />Link Student</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Link Student to Parent</DialogTitle></DialogHeader>
                    <form onSubmit={handleLink} className="space-y-4">
                      {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                      <div className="space-y-2">
                        <Label>Student</Label>
                        <Select value={linkForm.student_id} onValueChange={(v) => setLinkForm({ ...linkForm, student_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                          <SelectContent>
                            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <FieldError errors={fieldErrors} field="student_id" />
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Select value={linkForm.relationship} onValueChange={(v) => setLinkForm({ ...linkForm, relationship: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FieldError errors={fieldErrors} field="relationship" />
                      <Button type="submit" className="w-full">Link</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedParent ? (
                <p className="text-muted-foreground text-center py-12">Select a parent from the list to view details</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs">Email</Label><p className="text-sm">{selectedParent.email}</p></div>
                    <div><Label className="text-xs">Phone</Label><p className="text-sm">{selectedParent.phone || "—"}</p></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-2">Linked Children</h3>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/50"><th className="text-left p-2 font-medium">Name</th><th className="text-left p-2 font-medium">Student #</th><th className="text-left p-2 font-medium">Relationship</th><th className="text-left p-2 font-medium">Primary</th><th className="text-right p-2 font-medium">Actions</th></tr></thead>
                        <tbody>
                          {(!parentDetail?.children || parentDetail.children.length === 0) && (
                            <tr><td colSpan={5} className="text-center p-4 text-muted-foreground">No children linked</td></tr>
                          )}
                          {(parentDetail?.children || []).map((child) => (
                            <tr key={child.student_id} className="border-b last:border-0">
                              <td className="p-2">{child.first_name} {child.last_name}</td>
                              <td className="p-2">{child.student_number || "—"}</td>
                              <td className="p-2 capitalize">{child.relationship}</td>
                              <td className="p-2">
                                <Button
                                  variant={child.is_primary ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    if (child.is_primary) return;
                                    if (confirm("Set this parent as primary guardian for this child?")) {
                                      updateLink.mutate({ id: child.link_id, is_primary: true });
                                    }
                                  }}
                                >
                                  {child.is_primary ? "Primary" : "Set primary"}
                                </Button>
                              </td>
                              <td className="p-2 text-right">
                                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Unlink this child?")) unlinkParent.mutate(child.link_id); }}>
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
