import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import {
  useDisciplineCases, useCreateDisciplineCase, useResolveDisciplineCase,
} from "../hooks/useRoleModules";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Gavel } from "lucide-react";

const INCIDENT_TYPES = ["fighting", "cheating", "disrespect", "vandalism", "absenteeism", "other"];
const SANCTIONS = ["warning", "parent_conference", "detention", "suspension", "expulsion"];

export default function DisciplineManagementPage() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: casesData } = useDisciplineCases({ status: statusFilter });
  const resolve = useResolveDisciplineCase();
  const rows = casesData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.disc.title}</h1>
          <p className="text-muted-foreground">{t.disc.subtitle}</p>
        </div>
        <NewCaseDialog />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.qa.allStatuses}</SelectItem>
          <SelectItem value="open">{t.disc.open}</SelectItem>
          <SelectItem value="resolved">{t.disc.resolved}</SelectItem>
        </SelectContent>
      </Select>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">{t.security.studentCol}</th>
            <th className="p-3 font-medium">{t.disc.incidentType}</th>
            <th className="p-3 font-medium">{t.security.descriptionCol}</th>
            <th className="p-3 font-medium">{t.disc.sanction}</th>
            <th className="p-3 font-medium">{t.qa.status}</th>
            <th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b hover:bg-muted/30 align-top">
                <td className="p-3 font-medium">{d.student_first_name} {d.student_last_name}<span className="block text-xs text-muted-foreground">{d.student_code || ""}</span></td>
                <td className="p-3">{t.disc[`inc_${d.incident_type}`] || d.incident_type}</td>
                <td className="p-3 max-w-[220px]"><span className="block truncate" title={d.description}>{d.description}</span></td>
                <td className="p-3">{d.sanction ? t.disc[`san_${d.sanction}`] || d.sanction : "—"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === "open" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {t.disc[d.status]}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {d.status === "open" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const sanction = window.prompt(t.disc.promptSanction + "\n" + SANCTIONS.map((s) => t.disc[`san_${s}`]).join(", "));
                      if (!sanction) return;
                      const match = SANCTIONS.find((s) => s.startsWith(sanction.toLowerCase().slice(0, 4))) || "warning";
                      resolve.mutate({ id: d.id, sanction: match, outcome: d.description, parent_notified: true });
                    }}>
                      <Gavel className="h-3 w-3 mr-1" />{t.disc.resolveBtn}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t.common.noData}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

function NewCaseDialog() {
  const { t } = useI18n();
  const create = useCreateDisciplineCase();
  const [open, setOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");

  const { data: studentsData } = useQuery({
    queryKey: ["discipline-student-search", studentSearch],
    queryFn: () => api.get("/students", { params: { search: studentSearch, limit: 10 } }),
    enabled: open && studentSearch.length >= 2,
  });
  const candidates = studentsData?.data || [];

  function submit(e) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    create.mutate({ ...fd, student_id: studentId }, { onSuccess: () => { setOpen(false); setStudentId(""); setStudentSearch(""); } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Gavel className="h-4 w-4 mr-2" />{t.disc.newCase}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.disc.newCase}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t.security.studentCol}</Label>
            <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder={t.disc.searchStudent} required={!studentId} />
            {candidates.slice(0, 5).map((s) => (
              <button key={s.id} type="button"
                onClick={() => { setStudentId(s.id); setStudentSearch(`${s.first_name} ${s.last_name}`); }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded border ${studentId === s.id ? "border-neutral-900 bg-muted" : "hover:bg-muted"}`}>
                {s.first_name} {s.last_name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{t.disc.incidentType}</Label>
              <Select name="incident_type" defaultValue="other">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t.disc[`inc_${ty}`]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>{t.disc.hearingDate}</Label><Input name="hearing_date" type="date" /></div>
          </div>
          <div className="space-y-1"><Label>{t.security.descriptionCol}</Label><textarea name="description" rows={4} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          <Button type="submit" className="w-full" disabled={create.isPending || !studentId}>{t.common.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
