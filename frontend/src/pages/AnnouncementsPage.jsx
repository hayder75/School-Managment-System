import { useState } from "react";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useAnnouncements, useMyAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "../hooks/useAnnouncements";
import { useClasses } from "../hooks/useClasses";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Edit, Trash2, Megaphone } from "lucide-react";

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "admin" || user?.role === "owner";
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", audience: "all", class_id: "", is_published: true });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: manageData, isLoading } = useAnnouncements({ page, limit: 20 }, { enabled: canManage });
  const { data: myData, isLoading: myLoading } = useMyAnnouncements(undefined, { enabled: !canManage });
  const { data: classesData } = useClasses({ limit: 200 });
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const announcements = canManage ? (manageData?.data || []) : (myData?.data || []);
  const meta = manageData?.meta || {};
  const classes = classesData?.data || [];
  const loading = canManage ? isLoading : myLoading;

  function resetForm() {
    setForm({ title: "", content: "", audience: "all", class_id: "", is_published: true });
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    const payload = { ...form };
    if (!payload.class_id) delete payload.class_id;
    try {
      if (editing) {
        await updateAnnouncement.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createAnnouncement.mutateAsync(payload);
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function handleEdit(a) {
    setEditing(a);
    setForm({ title: a.title, content: a.content, audience: a.audience, class_id: a.class_id || "", is_published: a.is_published });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Broadcast messages to the school</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <FieldError errors={fieldErrors} field="title" />
                <div className="space-y-2">
                  <Label>Content</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                  />
                </div>
                <FieldError errors={fieldErrors} field="content" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="teachers">Teachers</SelectItem>
                        <SelectItem value="students">Students</SelectItem>
                        <SelectItem value="parents">Parents</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldError errors={fieldErrors} field="audience" />
                  <div className="space-y-2">
                    <Label>Class (if applicable)</Label>
                    <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All classes</SelectItem>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldError errors={fieldErrors} field="class_id" />
                </div>
                <Button type="submit" className="w-full">{editing ? "Update" : "Publish"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 && !loading && (
          <Card><CardContent className="text-center py-12 text-muted-foreground"><Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No announcements yet</p></CardContent></Card>
        )}
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{a.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    By {a.first_name} {a.last_name} · {!isNaN(new Date(a.created_at).getTime()) ? new Date(a.created_at).toLocaleDateString() : "—"} · Audience: <span className="capitalize">{a.audience}</span>
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(a)}><Edit className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this announcement?")) deleteAnnouncement.mutate(a.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
