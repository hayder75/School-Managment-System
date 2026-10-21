import { fullName } from "../../lib/fullName";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { FieldError } from "../../components/ui/form-error";
import { extractApiErrors } from "../../lib/form-utils";
import { useUsers, useCreateUser, useDeleteUser } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth";
import { canEditStaff } from "../../components/staff/StaffEditDialog";
import StaffEditDialog from "../../components/staff/StaffEditDialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Plus, Trash2, Search, Pencil } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

const roles = ["admin", "teacher", "student", "parent", "hr", "finance", "cashier", "support", "general_manager", "principal", "vice_principal", "quality_director", "general_services", "shift_coordinator", "accountant", "security_head", "librarian"];

export default function UsersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const myRole = useAuthStore((s) => s.user?.role);
  const canEdit = canEditStaff(myRole);
  const [editUser, setEditUser] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [roleFilter, setRoleFilter] = useState("");
  const { data, isLoading } = useUsers({ page, limit: 20, search: debouncedSearch, role: roleFilter || undefined });
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", role: "teacher", job_title: "", qualification: "", field_of_study: "", gender: "", section_count: "", periods_per_week: "", overtime_periods: "0" });
  const [fieldErrors, setFieldErrors] = useState({});

  const isStaffRole = ["admin", "teacher", "hr", "finance", "cashier", "support", "general_manager", "principal", "vice_principal", "quality_director", "general_services", "shift_coordinator", "accountant", "security_head", "librarian"].includes(form.role);

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      const payload = { ...form };
      payload.overtime_periods = form.overtime_periods === "" ? 0 : Number(form.overtime_periods);
      if (form.role === "teacher") {
        payload.section_count = form.section_count === "" ? undefined : Number(form.section_count);
        payload.periods_per_week = form.periods_per_week === "" ? undefined : Number(form.periods_per_week);
      } else {
        delete payload.section_count;
        delete payload.periods_per_week;
      }
      // Drop empty optional fields so the API gets a clean payload.
      for (const key of Object.keys(payload)) {
        if (payload[key] === "" || payload[key] === null || payload[key] === undefined) delete payload[key];
      }
      await createUser.mutateAsync(payload);
      setOpen(false);
      setForm({ email: "", first_name: "", last_name: "", role: "teacher", job_title: "", qualification: "", field_of_study: "", gender: "", section_count: "", periods_per_week: "", overtime_periods: "0" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  const users = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all users in your school</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="email" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="first_name" />
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="last_name" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>{t.roles[r] || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="role" />
              {isStaffRole && (
                <>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Teacher, Director" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qualification</Label>
                      <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. BA, MA" />
                    </div>
                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} placeholder="e.g. Mathematics" />
                    </div>
                  </div>
                  {form.role === "teacher" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border p-3">
                      <div className="space-y-2">
                        <Label>Section Count <span className="text-red-500">*</span></Label>
                        <Input type="number" min="0" required value={form.section_count} onChange={(e) => setForm({ ...form, section_count: e.target.value })} placeholder="e.g. 14" />
                      </div>
                      <div className="space-y-2">
                        <Label>Periods / Week <span className="text-red-500">*</span></Label>
                        <Input type="number" min="0" required value={form.periods_per_week} onChange={(e) => setForm({ ...form, periods_per_week: e.target.value })} placeholder="e.g. 22" />
                      </div>
                      <div className="space-y-2">
                        <Label>OT Periods / Week</Label>
                        <Input type="number" min="0" value={form.overtime_periods} onChange={(e) => setForm({ ...form, overtime_periods: e.target.value })} placeholder="e.g. 6" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, email, or role…"
                  className="pl-9 w-full sm:w-64"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{t.roles[r] || r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/staff/${user.id}`)}>
                          {fullName(user)}
                        </Button>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.roles[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell>{user.job_title || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "success" : user.status === "invited" ? "warning" : "destructive"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          {canEdit && (
                            <Button variant="ghost" size="icon" title={t("Edit details")} onClick={() => setEditUser(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => deleteUser.mutate(user.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StaffEditDialog user={editUser} open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }} />
    </div>
  );
}
