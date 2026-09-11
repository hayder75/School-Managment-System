import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from "../../hooks/useTenants";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function TenantsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTenants({ page, limit: 20 });
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", address: "", owner_email: "", owner_first_name: "", owner_last_name: "" });
  const [editForm, setEditForm] = useState({ name: "", slug: "", email: "", phone: "", address: "", status: "active", subscription_plan: "free" });

  async function handleCreate(e) {
    e.preventDefault();
    await createTenant.mutateAsync(form);
    setCreateOpen(false);
    setForm({ name: "", slug: "", email: "", phone: "", address: "", owner_email: "", owner_first_name: "", owner_last_name: "" });
  }

  function openEdit(tenant) {
    setEditTarget(tenant);
    setEditForm({
      name: tenant.name || "",
      slug: tenant.slug || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      address: tenant.address || "",
      status: tenant.status || "active",
      subscription_plan: tenant.subscription_plan || "free",
    });
    setEditOpen(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editTarget) return;
    await updateTenant.mutateAsync({ id: editTarget.id, data: editForm });
    setEditOpen(false);
    setEditTarget(null);
  }

  const tenants = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Schools")}</h1>
          <p className="text-muted-foreground">{t("Manage all schools in the system")}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> {t("Add School")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("Create New School")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("School Name *")}</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Slug *")}</Label>
                  <Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-school" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Email")}</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Phone")}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Address")}</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">{t("School Owner (optional)")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Owner Email")}</Label>
                    <Input type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} placeholder="owner@school.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Owner Phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>{t("First Name")}</Label>
                    <Input value={form.owner_first_name} onChange={(e) => setForm({ ...form, owner_first_name: e.target.value })} placeholder="School" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Last Name")}</Label>
                    <Input value={form.owner_last_name} onChange={(e) => setForm({ ...form, owner_last_name: e.target.value })} placeholder="Owner" />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createTenant.isPending}>
                {createTenant.isPending ? t("Creating...") : t("Create School")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("All Schools")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Name")}</TableHead>
                    <TableHead>{t("Slug")}</TableHead>
                    <TableHead>{t("Email")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead>{t("Plan")}</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id} className="group">
                      <TableCell>
                        <button
                          className="font-medium text-left hover:text-primary hover:underline cursor-pointer"
                          onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                        >
                          {tenant.name}
                        </button>
                      </TableCell>
                      <TableCell>{tenant.slug}</TableCell>
                      <TableCell>{tenant.email || "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "active" ? "success" : "warning"}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{tenant.subscription_plan}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)} title={t("Edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/tenants/${tenant.id}`)} title={t("View details")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteTenant.mutate(tenant.id)} title={t("Delete")}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t("No schools yet")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("Page {page} of {total}", { page: meta.page, total: meta.totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("Previous")}</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("Next")}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Edit School")}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("School Name *")}</Label>
                  <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Slug")}</Label>
                  <Input value={editForm.slug} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Email")}</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Phone")}</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Address")}</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Status")}</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("Active")}</SelectItem>
                      <SelectItem value="suspended">{t("Suspended")}</SelectItem>
                      <SelectItem value="trial">{t("Trial")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Subscription Plan")}</Label>
                  <Select value={editForm.subscription_plan} onValueChange={(v) => setEditForm({ ...editForm, subscription_plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t("Free")}</SelectItem>
                      <SelectItem value="basic">{t("Basic")}</SelectItem>
                      <SelectItem value="premium">{t("Premium")}</SelectItem>
                      <SelectItem value="enterprise">{t("Enterprise")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateTenant.isPending}>
                {updateTenant.isPending ? t("Saving...") : t("Save Changes")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
