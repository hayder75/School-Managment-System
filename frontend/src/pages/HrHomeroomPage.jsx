import { useState } from "react";
import { useHomeroom, useSetHomeroom } from "../hooks/useHr";
import { useToast } from "../store/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { useI18n } from "../i18n/I18nContext";
import { levelLabel } from "../lib/levels";

export default function HrHomeroomPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = useHomeroom();
  const setHomeroom = useSetHomeroom();
  const [saving, setSaving] = useState(null);

  const classes = data?.data?.classes || [];
  const teachers = data?.data?.teachers || [];
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
                              <SelectItem key={tt.id} value={tt.id}>{tt.first_name} {tt.last_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{t("No classes found")}</td></tr>
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
