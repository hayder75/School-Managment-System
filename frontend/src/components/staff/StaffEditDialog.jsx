import { useState, useEffect } from "react";
import { useUpdateUser, useUser, useUpdateUserCompensation } from "../../hooks/useUsers";
import { useAuthStore } from "../../store/auth";
import { useToast } from "../../store/toast";
import { FieldError } from "../ui/form-error";
import { extractApiErrors } from "../../lib/form-utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useI18n } from "../../i18n/I18nContext";

const emptyForm = {
  first_name: "", last_name: "", phone: "", gender: "",
  job_title: "", qualification: "", field_of_study: "",
  section_count: "", periods_per_week: "", overtime_periods: "", joined_at: "", status: "active",
  basic_salary: "", allowance: "", housing_allowance: "", account_allowance: "", phone_allowance: "", scope: "all",
};

// Roles allowed to edit staff details (mirrors the backend PUT /users/:id guard).
const EDITOR_ROLES = ["admin", "owner", "hr", "quality_director", "principal", "vice_principal"];
// Only finance (and admin/owner) may change compensation.
const COMP_ROLES = ["admin", "owner", "finance"];

export function canEditStaff(role) {
  return EDITOR_ROLES.includes(role);
}
export function canEditCompensation(role) {
  return COMP_ROLES.includes(role);
}
export function canEditScope(role) {
  return ['admin', 'owner', 'general_manager'].includes(role);
}

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All levels (no restriction)', groups: null },
  { value: 'nursery', label: 'Nursery only', groups: ['nursery'] },
  { value: 'kg', label: 'KG only (LKG/UKG)', groups: ['kg'] },
  { value: 'nursery_kg', label: 'Kindergarten (Nursery/LKG/UKG)', groups: ['nursery', 'kg'] },
  { value: 'primary', label: 'Primary (Grade 1-8)', groups: ['primary'] },
];

function scopeToValue(scopes) {
  if (!Array.isArray(scopes) || !scopes.length) return 'all';
  const key = [...scopes].sort().join(',');
  const found = SCOPE_OPTIONS.find((o) => o.groups && [...o.groups].sort().join(',') === key);
  return found ? found.value : 'all';
}

export default function StaffEditDialog({ user, open, onOpenChange }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canComp = canEditCompensation(role);
  // Always load the complete, current record rather than trusting a list row.
  const { data: fresh } = useUser(open && user?.id ? user.id : null);
  const source = fresh?.data || user;
  const update = useUpdateUser();
  const updateComp = useUpdateUserCompensation();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!source) return;
    setForm({
      first_name: source.first_name || "",
      last_name: source.last_name || "",
      phone: source.phone || "",
      gender: source.gender || "",
      job_title: source.job_title || "",
      qualification: source.qualification || "",
      field_of_study: source.field_of_study || "",
      section_count: source.section_count ?? "",
      periods_per_week: source.periods_per_week ?? "",
      overtime_periods: source.overtime_periods ?? "",
      joined_at: source.joined_at ? String(source.joined_at).slice(0, 10) : "",
      status: source.status || "active",
      basic_salary: source.basic_salary ?? "",
      allowance: source.allowance ?? "",
      housing_allowance: source.housing_allowance ?? "",
      account_allowance: source.account_allowance ?? "",
      phone_allowance: source.phone_allowance ?? "",
      scope: scopeToValue(source.scope_level_groups),
    });
    setErrors({});
  }, [source]);

  const intOrNull = (v) => (v === "" || v == null ? null : Number(v));

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    try {
      await update.mutateAsync({
        id: source.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone || null,
        gender: form.gender || null,
        job_title: form.job_title || null,
        qualification: form.qualification || null,
        field_of_study: form.field_of_study || null,
        section_count: intOrNull(form.section_count),
        periods_per_week: intOrNull(form.periods_per_week),
        overtime_periods: intOrNull(form.overtime_periods),
        joined_at: form.joined_at || null,
        status: form.status,
        ...(canEditScope(role) ? { scope_level_groups: (SCOPE_OPTIONS.find((o) => o.value === form.scope) || {}).groups || null } : {}),
      });
      if (canComp) {
        await updateComp.mutateAsync({
          id: source.id,
          basic_salary: intOrNull(form.basic_salary),
          allowance: intOrNull(form.allowance),
          housing_allowance: intOrNull(form.housing_allowance),
          account_allowance: intOrNull(form.account_allowance),
          phone_allowance: intOrNull(form.phone_allowance),
        });
      }
      toast(t("Saved successfully"), "success");
      onOpenChange(false);
    } catch (err) {
      setErrors(extractApiErrors(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Edit Staff Details")}</DialogTitle>
          <DialogDescription>{source?.email} &middot; {source?.role}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("First Name")}</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              <FieldError errors={errors} field="first_name" />
            </div>
            <div className="space-y-2">
              <Label>{t("Grandfather name")}</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              <FieldError errors={errors} field="last_name" />
            </div>
            <div className="space-y-2">
              <Label>{t("Phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Gender")}</Label>
              <Select value={form.gender || "none"} onValueChange={(v) => setForm({ ...form, gender: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder={t("Select")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="male">{t("Male")}</SelectItem>
                  <SelectItem value="female">{t("Female")}</SelectItem>
                  <SelectItem value="other">{t("Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Job Title")}</Label>
              <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Qualification")}</Label>
              <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Field of Study")}</Label>
              <Input value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Joining Date")}</Label>
              <Input type="date" value={form.joined_at} onChange={(e) => setForm({ ...form, joined_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="invited">{t("Invited")}</SelectItem>
                  <SelectItem value="suspended">{t("Suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Sections")}</Label>
              <Input type="number" min="0" value={form.section_count} onChange={(e) => setForm({ ...form, section_count: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Periods / Week")}</Label>
              <Input type="number" min="0" value={form.periods_per_week} onChange={(e) => setForm({ ...form, periods_per_week: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Overtime Periods")}</Label>
              <Input type="number" min="0" value={form.overtime_periods} onChange={(e) => setForm({ ...form, overtime_periods: e.target.value })} />
            </div>
          </div>

          {canEditScope(role) && (
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground mb-3">{t("Data scope — which classes this person can see")}</p>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("Compensation (ETB)")}</p>
              {!canComp && <span className="text-[11px] text-muted-foreground">{t("Only Finance can edit — read only")}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("Basic Salary")}</Label>
                <Input type="number" min="0" step="0.01" disabled={!canComp} value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("Allowance")}</Label>
                <Input type="number" min="0" step="0.01" disabled={!canComp} value={form.allowance} onChange={(e) => setForm({ ...form, allowance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("Housing Allowance")}</Label>
                <Input type="number" min="0" step="0.01" disabled={!canComp} value={form.housing_allowance} onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("Account Allowance")}</Label>
                <Input type="number" min="0" step="0.01" disabled={!canComp} value={form.account_allowance} onChange={(e) => setForm({ ...form, account_allowance: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("Phone Allowance")}</Label>
                <Input type="number" min="0" step="0.01" disabled={!canComp} value={form.phone_allowance} onChange={(e) => setForm({ ...form, phone_allowance: e.target.value })} />
              </div>
            </div>
          </div>

          {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("Cancel")}</Button>
            <Button type="submit" disabled={update.isPending || updateComp.isPending}>{update.isPending || updateComp.isPending ? t("Saving...") : t("Save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
