import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReportRenderer from "../components/reports/ReportRenderer";
import { StaticTables } from "../components/reports/DetailTables";
import { Card, CardContent } from "../components/ui/card";
import { School } from "lucide-react";

export default function PublicReportPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/reports/${token}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && j.success) setState({ loading: false, data: j.data });
        else setState({ loading: false, error: j?.error?.message || "This link is not available" });
      })
      .catch(() => alive && setState({ loading: false, error: "Network error" }));
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
          <School className="h-5 w-5" />
          <span className="font-semibold">Mount Olive School</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {state.loading ? (
          <p className="text-muted-foreground py-16 text-center">Loading…</p>
        ) : state.error ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">{state.error}</CardContent></Card>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold">{state.data.title}</h1>
              <p className="text-sm text-muted-foreground">
                Shared report
                {state.data.filters?.from ? ` · ${state.data.filters.from} – ${state.data.filters.to || ""}` : ""}
              </p>
            </div>
            <ReportRenderer data={state.data.payload} />
            <StaticTables tables={state.data.payload?.tables || []} />
            <p className="text-xs text-muted-foreground text-center pt-4">
              Shared snapshot · generated {new Date(state.data.created_at).toLocaleString()}
              {state.data.expires_at ? ` · expires ${String(state.data.expires_at).slice(0, 10)}` : ""}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
