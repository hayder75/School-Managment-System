import { useState, useEffect } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function TaxSettingsPage() {
  const { t } = useI18n();
  const [brackets, setBrackets] = useState([]);
  const [form, setForm] = useState({ min_salary: "", max_salary: "", rate: "", deduction: "0" });

  useEffect(() => { loadBrackets(); }, []);
  async function loadBrackets() { const r = await api.get("/payroll/tax-brackets"); setBrackets(r.data || []); }
  async function addBracket() {
    await api.post("/payroll/tax-brackets", { min_salary: Number(form.min_salary), max_salary: form.max_salary ? Number(form.max_salary) : undefined, rate: Number(form.rate), deduction: Number(form.deduction) });
    setForm({ min_salary: "", max_salary: "", rate: "", deduction: "0" });
    loadBrackets();
  }
  async function removeBracket(id) { await api.delete(`/payroll/tax-brackets/${id}`); loadBrackets(); }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("Tax Brackets")}</h1>
      <p className="text-muted-foreground text-sm">{t("Ethiopian PAYE progressive tax brackets")}</p>
      <Card><CardHeader><CardTitle>{t("Add Bracket")}</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end flex-wrap">
          <div><Label>{t("Min Salary")}</Label><Input type="number" value={form.min_salary} onChange={e => setForm({...form,min_salary:e.target.value})} className="w-28" /></div>
          <div><Label>{t("Max Salary")}</Label><Input type="number" value={form.max_salary} onChange={e => setForm({...form,max_salary:e.target.value})} className="w-28" /></div>
          <div><Label>{t("Rate (%)")}</Label><Input type="number" value={form.rate} onChange={e => setForm({...form,rate:e.target.value})} className="w-20" /></div>
          <div><Label>{t("Deduction")}</Label><Input type="number" value={form.deduction} onChange={e => setForm({...form,deduction:e.target.value})} className="w-24" /></div>
          <Button onClick={addBracket}><Plus className="h-4 w-4 mr-1" />{t("Add")}</Button>
        </div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle>{t("Brackets")} ({brackets.length})</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">
          {brackets.map(b => <div key={b.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
            <span>{b.min_salary} - {b.max_salary || "∞"} ETB → <strong>{b.rate}%</strong> ({t("deduction")}: {b.deduction})</span>
            <Button variant="ghost" size="icon" onClick={() => removeBracket(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>)}
          {brackets.length === 0 && <p className="text-muted-foreground">{t("No tax brackets configured")}</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}
