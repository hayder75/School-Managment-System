import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenant, useUpdateTenant, useDeleteTenant } from "../../hooks/useTenants";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { EthiopianDate } from "../../components/ui/EthiopianDate";
import { ArrowLeft, Building2, Users, GraduationCap, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function DetailRow({ label, value }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{t(label)}</span>
      <span className="text-sm font-medium">{value || "\u2014"}</span>
    </div>
  );
}

export default function TenantDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: tenantData, isLoading } = useTenant(id);
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [editOpen, setEditOpen] = useState(false);
  const tenant = tenantData?.data || {};

  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", address: "",
    status: "active", subscription_plan: "free",
  });

  function openEdit() {
    setEditForm({
      name: tenant.name || "",
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
    await updateTenant.mutateAsync({ id, data: editForm });
    setEditOpen(false);
  }

  async function handleDelete() {
    if (!confirm(t("Are you sure you want to delete this school? This cannot be undone."))) return;
    await deleteTenant.mutateAsync(id);
    navigate("/admin/tenants");
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/tenants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <Badge variant={tenant.status === "active" ? "success" : "warning"}>{tenant.status}</Badge>
          </div>
          <p className="text-muted-foreground">{t("Slug")}: {tenant.slug} &middot; {tenant.subscription_plan} {t("plan")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-2" /> {t("Edit")}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> {t("Delete")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> {t("Users")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenant.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground">{tenant.activeUsers || 0} {t("active")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" /> {t("Students")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenant.students || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> {t("Teachers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tenant.teachers || 0}</p>
            <p className="text-xs text-muted-foreground">{tenant.admins || 0} {t("admins")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> {t("School Details")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="School Name" value={tenant.name} />
            <DetailRow label="Slug" value={tenant.slug} />
            <DetailRow label="Email" value={tenant.email} />
            <DetailRow label="Phone" value={tenant.phone} />
            <DetailRow label="Address" value={tenant.address} />
            <DetailRow label="Status" value={tenant.status} />
            <DetailRow label="Plan" value={tenant.subscription_plan} />
            <DetailRow label="Created" value={tenant.created_at ? <EthiopianDate date={tenant.created_at} /> : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> {t("User Breakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.roleBreakdown?.length > 0 ? (
              <div className="space-y-2">
                {tenant.roleBreakdown.map((r) => (
                  <div key={r.role} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span className="capitalize font-medium">{r.role}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No users")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> {t("Branches")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.branchList?.length > 0 ? (
              <div className="space-y-2">
                {tenant.branchList.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span className="font-medium">{b.name}</span>
                    <div className="flex items-center gap-2">
                      {b.is_head_office && <Badge variant="secondary">{t("Head Office")}</Badge>}
                      {b.phone && <span className="text-muted-foreground">{b.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No branches")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Edit School")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("School Name *")}</Label>
                <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("Slug")}</Label>
                <Input value={tenant.slug} disabled className="bg-muted" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
