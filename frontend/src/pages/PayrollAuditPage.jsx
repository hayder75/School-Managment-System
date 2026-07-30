import { useState, useEffect } from "react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function PayrollAuditPage() {
  const [audits, setAudits] = useState([]);
  useEffect(() => { api.get("/payroll/audits").then(r => setAudits(r.data || [])).catch(()=>{}); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payroll Audit Log</h1>
      <Card><CardContent className="pt-6">
        {audits.length === 0 ? <p className="text-muted-foreground">No audit records yet</p> : (
          <div className="space-y-2">
            {audits.map(a => <div key={a.id} className="border-b pb-2 text-sm">
              <span className="font-medium capitalize">{a.action}</span> by {a.performed_by_name || "System"}
              <span className="text-xs text-muted-foreground ml-2">{new Date(a.created_at).toLocaleString()}</span>
            </div>)}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
