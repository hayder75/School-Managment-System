import { useState } from "react";
import { useClasses } from "../hooks/useClasses";
import { useStudentFeeSubscriptions, useSetStudentFeeSubscription } from "../hooks/useFees";
import { useToast } from "../store/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useI18n } from "../i18n/I18nContext";

export default function StudentFeesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [classId, setClassId] = useState("");
  const { data: classesData } = useClasses({ limit: 200 });
  const { data, isLoading } = useStudentFeeSubscriptions(classId ? { class_id: classId } : {});
  const setSub = useSetStudentFeeSubscription();

  const classes = classesData?.data || [];
  const fees = data?.data?.fees || [];
  const students = data?.data?.students || [];

  async function toggle(student, fee, current) {
    try {
      await setSub.mutateAsync({ student_id: student.id, fee_structure_id: fee.id, subscribed: !current });
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Could not update subscription"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Students Fee Management")}</h1>
        <p className="text-muted-foreground">{t("Turn optional fees (transport, after-school, etc.) on or off per student")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-64"><SelectValue placeholder={t("All Classes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("All Classes")}</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{students.length} {t("students")}</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : fees.length === 0 ? (
            <p className="text-muted-foreground">{t("No optional fee structures yet. Create an optional fee first.")}</p>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground">{t("No students found")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">{t("Student")}</th>
                    <th className="text-left p-3 font-medium">{t("Class")}</th>
                    {fees.map((f) => (
                      <th key={f.id} className="text-center p-3 font-medium whitespace-nowrap">{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <TableCell className="font-medium">
                        {s.first_name} {s.last_name}
                        <span className="block text-xs text-muted-foreground font-mono">{s.student_number || "—"}</span>
                      </TableCell>
                      <TableCell>{s.class_name || "—"}</TableCell>
                      {fees.map((f) => {
                        const on = (s.subscribed_fee_ids || []).includes(f.id);
                        return (
                          <TableCell key={f.id} className="text-center">
                            <button
                              type="button"
                              disabled={setSub.isPending}
                              onClick={() => toggle(s, f, on)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-neutral-300"}`}
                              title={on ? t("On") : t("Off")}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </TableCell>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
