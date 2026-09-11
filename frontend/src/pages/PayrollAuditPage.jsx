import { useState, useEffect } from "react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { useI18n } from "../i18n/I18nContext";

export default function PayrollAuditPage() {
  const { t } = useI18n();
  const [audits, setAudits] = useState([]);
  useEffect(() => { api.get("/payroll/audits").then(r => setAudits(r.data || [])).catch(()=>{}); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("Payroll Audit Log")}</h1>
      <Card><CardContent className="pt-6">
        {audits.length === 0 ? <p className="text-muted-foreground">{t("No audit records yet")}</p> : (
          <div className="space-y-2">
            {audits.map(a => <div key={a.id} className="border-b pb-2 text-sm">
              <span className="font-medium capitalize">{a.action}</span> {t("by")} {a.performed_by_name || t("System")}
              <span className="text-xs text-muted-foreground ml-2"><EthiopianDate date={a.created_at} /></span>
            </div>)}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
