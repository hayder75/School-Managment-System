import { fullName } from "../lib/fullName";
import { useState } from "react";
import { useHomeroom, useSetHomeroom } from "../hooks/useHr";
import { useClassSupportStaff, useAddClassSupportStaff, useRemoveClassSupportStaff } from "../hooks/useClasses";
import { useToast } from "../store/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { useI18n } from "../i18n/I18nContext";
import { levelLabel } from "../lib/levels";
import { X } from "lucide-react";

function SupportCell({ cls, teachers }) {
  const { t } = useI18n();
  const { data } = useClassSupportStaff(cls.id);
  const add = useAddClassSupportStaff();
  const remove = useRemoveClassSupportStaff();
  const support = data?.data || [];
  const assigned = new Set(support.map((s) => s.user_id));
  const options = teachers.filter((tt) => tt.id !== cls.class_teacher_id && !assigned.has(tt.id));

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {support.map((sp) => (
          <span key={sp.user_id} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs">
            {fullName(sp)}
            <button type="button" className="text-muted-foreground hover:text-rose-600" onClick={() => remove.mutate({ classId: cls.id, userId: sp.user_id })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!support.length && <span className="text-xs text-muted-foreground">{t("None")}</span>}
      </div>
      <Select
        value=""
        onValueChange={(v) => v && add.mutate({ classId: cls.id, userId: v })}
        disabled={!options.length || add.isPending}
      >
        <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder={t("Add support staff…")} /></SelectTrigger>
        <SelectContent>
          {options.map((tt) => (
            <SelectItem key={tt.id} value={tt.id}>{fullName(tt)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function HrHomeroomPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = useHomeroom();
  const setHomeroom = useSetHomeroom();
  const [saving, setSaving] = useState(null);

  const classes = data?.data?.classes || [];
  const teachers = data?.data?.teachers || [];
  const supportStaff = data?.data?.support_staff || [];
  const assigned = classes.filter((c) => c.class_teacher_id).length;

  async function assign(cls, teacherId) {
    setSaving(cls.id);
    try {
      await setHomeroom.mutateAsync({ classId: cls.id, teacherId: teacherId === "none" ? null : teacherId });
      toast(t("Saved successfully"), "success");
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Failed to save"), "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Homeroom Assignment")}</h1>
        <p className="text-muted-foreground">{t("Assign a homeroom teacher to each class")}</p>
      </div>

      <div className="flex gap-3">
        <Badge variant="success">{assigned} {t("assigned")}</Badge>
        <Badge variant="secondary">{classes.length - assigned} {t("unassigned")}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Classes")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">{t("Class")}</th>
                    <th className="text-left p-3 font-medium">{t("Level")}</th>
                    <th className="text-left p-3 font-medium">{t("Homeroom Teacher")}</th>
                    <th className="text-left p-3 font-medium">{t("Support staff")}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-muted-foreground">{levelLabel(c.level_group, c.grade_level)}</td>
                      <td className="p-3">
                        <Select
                          value={c.class_teacher_id || "none"}
                          onValueChange={(v) => assign(c, v)}
                          disabled={saving === c.id}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue placeholder={t("Unassigned")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("— Unassigned —")}</SelectItem>
                            {teachers.map((tt) => (
                              <SelectItem key={tt.id} value={tt.id}>{fullName(tt)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <SupportCell cls={c} teachers={supportStaff} />
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t("No classes found")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
