import { useState } from "react";
import {
  usePerformanceCriteria, useCreateCriteria, useUpdateCriteria, useDeleteCriteria, usePerformanceScores,
} from "../hooks/usePerformance";
import { useToast } from "../store/toast";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function StaffPerformancePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = usePerformanceCriteria();
  const { data: scoreData } = usePerformanceScores();
  const create = useCreateCriteria();
  const update = useUpdateCriteria();
  const del = useDeleteCriteria();
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [weights, setWeights] = useState({});

  const criteria = data?.data || [];
  const scores = scoreData?.data || [];
  const totalWeight = criteria.filter((c) => c.is_active).reduce((s, c) => s + Number(weights[c.id] ?? c.weight ?? 0), 0);

  async function add(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await create.mutateAsync({ name: newName.trim(), weight: Number(newWeight) || 0 });
      setNewName(""); setNewWeight("");
      toast(t("Saved successfully"), "success");
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  async function saveWeight(c) {
    const w = Number(weights[c.id] ?? c.weight ?? 0);
    try { await update.mutateAsync({ id: c.id, weight: w }); toast(t("Saved successfully"), "success"); }
    catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Staff Performance")}</h1>
        <p className="text-muted-foreground">{t("Define evaluation criteria and their weights used to measure staff performance")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("Criteria & Weights")}</span>
            <Badge variant={totalWeight === 100 ? "success" : "secondary"}>{t("Total")}: {totalWeight}%</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Criterion")}</TableHead>
                    <TableHead className="w-40">{t("Weight (%)")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.name}
                        {c.is_active === false && <Badge variant="secondary" className="ml-2">{t("Inactive")}</Badge>}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" max="100" className="w-24"
                          value={weights[c.id] ?? c.weight}
                          onChange={(e) => setWeights({ ...weights, [c.id]: e.target.value })}
                          onBlur={() => saveWeight(c)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {criteria.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">{t("No criteria yet")}</td></tr>}
                </TableBody>
              </Table>
            </div>
          )}

          <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-2 flex-1 min-w-56"><Label>{t("New criterion")}</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("e.g. Student Results")} /></div>
            <div className="space-y-2 w-32"><Label>{t("Weight (%)")}</Label><Input type="number" min="0" max="100" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} /></div>
            <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4 mr-1" />{t("Add")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Historical Scores")}</CardTitle></CardHeader>
        <CardContent>
          {scores.length === 0 ? (
            <p className="text-muted-foreground">{t("No records")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Staff")}</TableHead>
                    <TableHead>{t("Job Title")}</TableHead>
                    <TableHead>{t("Year")}</TableHead>
                    <TableHead>{t("Semester")}</TableHead>
                    <TableHead className="text-right">{t("Score")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.staff_name}</TableCell>
                      <TableCell>{s.job_title}</TableCell>
                      <TableCell>{s.academic_year}</TableCell>
                      <TableCell>{s.semester}</TableCell>
                      <TableCell className="text-right">{Number(s.score).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
