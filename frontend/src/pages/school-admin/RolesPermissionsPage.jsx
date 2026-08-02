import { useState, useMemo, useEffect } from "react";
import { useRoles, useRolePermissions, useCreateRole, useUpdateRole, useDeleteRole, useUserRoles, useSetUserRoles } from "../../hooks/useRoles";
import { useUsers } from "../../hooks/useUsers";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Plus, Pencil, Trash2, ShieldCheck, Users } from "lucide-react";

function PermissionCheckbox({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-2 p-2 rounded border hover:bg-muted cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <span className="text-sm font-medium">{label}</span>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </label>
  );
}

function RoleDialog({ open, onOpenChange, role, permissions, onSubmit, submitLabel }) {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [keys, setKeys] = useState(() => new Set(role?.permission_keys || []));
  const [error, setError] = useState("");

  const toggle = (key) => {
    const next = new Set(keys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setKeys(next);
  };

  function reset() {
    setName(role?.name || "");
    setDescription(role?.description || "");
    setKeys(new Set(role?.permission_keys || []));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }
    try {
      await onSubmit({ name: name.trim(), description, permission_keys: [...keys] });
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to save role");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{submitLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teacher Leader" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" />
            </div>
          </div>
          <div>
            <Label>Permissions</Label>
            <div className="grid gap-2 mt-2 sm:grid-cols-2">
              {permissions.map((p) => (
                <PermissionCheckbox
                  key={p.key}
                  label={p.label}
                  description={p.description}
                  checked={keys.has(p.key)}
                  onChange={() => toggle(p.key)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RolesTab({ permissions }) {
  const { data, isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const roles = data?.data || [];

  const systemNames = new Set(["owner", "admin", "teacher", "student", "parent", "finance", "hr", "support"]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Role
        </Button>
      </div>
      <Card>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-6">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_system ? "secondary" : "default"}>
                        {r.is_system ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-lg">
                        {r.permissions.slice(0, 6).map((p) => (
                          <Badge key={p.key} variant="outline">{p.label}</Badge>
                        ))}
                        {r.permissions.length > 6 && (
                          <Badge variant="outline">+{r.permissions.length - 6} more</Badge>
                        )}
                        {r.permissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">No permissions</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setDialog(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!r.is_system && (
                          <Button variant="ghost" size="icon" onClick={() => deleteRole.mutate(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No roles found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <RoleDialog
        open={dialog}
        onOpenChange={setDialog}
        role={editing}
        permissions={permissions}
        submitLabel={editing ? "Update Role" : "Create Role"}
        onSubmit={editing ? (d) => updateRole.mutateAsync({ id: editing.id, ...d }) : (d) => createRole.mutateAsync(d)}
      />
      {systemNames.size === 0 && null}
    </div>
  );
}

function UserOverridesTab({ permissions, customRoles }) {
  const [userId, setUserId] = useState("");
  const { data: usersData } = useUsers({ limit: 200 });
  const { data: userAccess } = useUserRoles(userId);
  const setUserRoles = useSetUserRoles();
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const users = usersData?.data || [];
  const access = userAccess?.data;

  function selectUser(id) {
    setUserId(id);
    setMessage("");
    setSelectedRoles(new Set());
    setSelectedPerms(new Set());
  }

  const applied = useMemo(() => {
    if (!access) return { roles: new Set(), perms: new Set() };
    return {
      roles: new Set(access.roles.map((r) => r.id)),
      perms: new Set(access.permissions.map((p) => p.key)),
    };
  }, [access]);

  useEffect(() => {
    setSelectedRoles(new Set(access?.roles.map((r) => r.id) || []));
    setSelectedPerms(new Set(access?.permissions.map((p) => p.key) || []));
  }, [access]);

  const isDirty =
    userId &&
    (selectedRoles.size !== applied.roles.size ||
      [...selectedRoles].some((r) => !applied.roles.has(r)) ||
      selectedPerms.size !== applied.perms.size ||
      [...selectedPerms].some((p) => !applied.perms.has(p)));

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await setUserRoles.mutateAsync({
        userId,
        role_ids: [...selectedRoles],
        permission_keys: [...selectedPerms],
      });
      setMessage("Saved successfully");
    } catch (err) {
      setMessage(err?.error?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assign extra roles & permissions to a user</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={userId} onValueChange={selectUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} — {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {access && (
            <>
              <div className="text-sm">
                <span className="text-muted-foreground">Base role: </span>
                <Badge variant="secondary">{access.user.role}</Badge>
              </div>

              <div>
                <Label>Extra roles</Label>
                <div className="grid gap-2 mt-2 sm:grid-cols-2">
                  {customRoles.map((r) => {
                    const checked = selectedRoles.has(r.id);
                    return (
                      <PermissionCheckbox
                        key={r.id}
                        label={r.name}
                        description={r.description}
                        checked={checked}
                        onChange={(val) => {
                          const next = new Set(selectedRoles);
                          if (val) next.add(r.id);
                          else next.delete(r.id);
                          setSelectedRoles(next);
                        }}
                      />
                    );
                  })}
                  {customRoles.length === 0 && (
                    <p className="text-xs text-muted-foreground">No custom roles yet. Create one in the Roles tab.</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Direct permissions</Label>
                <div className="grid gap-2 mt-2 sm:grid-cols-2">
                  {permissions.map((p) => {
                    const checked = selectedPerms.has(p.key);
                    return (
                      <PermissionCheckbox
                        key={p.key}
                        label={p.label}
                        description={p.description}
                        checked={checked}
                        onChange={(val) => {
                          const next = new Set(selectedPerms);
                          if (val) next.add(p.key);
                          else next.delete(p.key);
                          setSelectedPerms(next);
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={saving || !isDirty}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                {message && <span className="text-sm text-muted-foreground">{message}</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RolesPermissionsPage() {
  const { data: permsData, isLoading } = useRolePermissions();
  const { data: rolesData } = useRoles();
  const permissions = permsData?.data || [];
  const roles = rolesData?.data || [];
  const customRoles = roles.filter((r) => !r.is_system);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-muted-foreground">
          Control what each role can do in your school. Changes take effect immediately.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Tabs defaultValue="roles">
          <TabsList>
            <TabsTrigger value="roles">
              <ShieldCheck className="h-4 w-4 mr-1" /> Roles
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-1" /> User Overrides
            </TabsTrigger>
          </TabsList>
          <TabsContent value="roles">
            <RolesTab permissions={permissions} />
          </TabsContent>
          <TabsContent value="users">
            <UserOverridesTab permissions={permissions} customRoles={customRoles} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
