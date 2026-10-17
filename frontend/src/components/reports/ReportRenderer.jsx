import { BarChart, LineChart, DonutChart } from "../ui/charts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { StatCard, Progress, Insight } from "./ReportKit";
import { Download } from "lucide-react";

const PALETTE = ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4", "#a0b2c6", "#e0a458"];

function downloadHeatmap(sec) {
  const cell = 46, padL = 120, padT = 54;
  const cols = sec.cols || [], rows = sec.rows || [], data = sec.data || [];
  const w = padL + cols.length * cell + 16;
  const h = padT + rows.length * cell + 16;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111827"; ctx.font = "bold 15px sans-serif";
  ctx.fillText(sec.title || "Heatmap", 10, 22);
  const vals = data.flat().filter((v) => v != null);
  const max = Math.max(1, ...vals);
  ctx.font = "11px sans-serif";
  cols.forEach((c, ci) => {
    ctx.save();
    ctx.translate(padL + ci * cell + cell / 2, padT - 8);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#4b5563";
    ctx.fillText(c, 0, 0);
    ctx.restore();
  });
  rows.forEach((r, ri) => {
    ctx.textAlign = "right"; ctx.fillStyle = "#4b5563";
    ctx.fillText(r, padL - 8, padT + ri * cell + cell / 2 + 4);
    ctx.textAlign = "left";
    cols.forEach((c, ci) => {
      const v = data[ri]?.[ci];
      const t = v == null ? null : Math.max(0, Math.min(1, v / max));
      ctx.fillStyle = t == null ? "#f3f4f6" : `rgba(44,90,94,${0.12 + 0.85 * t})`;
      ctx.fillRect(padL + ci * cell + 1, padT + ri * cell + 1, cell - 2, cell - 2);
      if (v != null) {
        ctx.fillStyle = t > 0.5 ? "#ffffff" : "#374151";
        ctx.textAlign = "center";
        ctx.fillText(String(Math.round(v)), padL + ci * cell + cell / 2, padT + ri * cell + cell / 2 + 4);
        ctx.textAlign = "left";
      }
    });
  });
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${(sec.title || "heatmap").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.png`;
  a.click();
}

function Section({ sec }) {
  const data = sec.data || [];
  let body = null;
  if (sec.type === "bar") body = <BarChart data={data} color={sec.color} />;
  else if (sec.type === "line") body = <LineChart data={data} color={sec.color} />;
  else if (sec.type === "donut") {
    const total = data.reduce((s, x) => s + (Number(x.value) || 0), 0);
    body = <DonutChart total={total} caption={sec.caption || ""} segments={data.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }))} />;
  } else if (sec.type === "progress") {
    const max = Math.max(1, ...data.map((x) => Number(x.value) || 0));
    body = (
      <div className="space-y-3">
        {data.map((r, i) => (
          <Progress key={i} label={r.label} right={String(r.value)} value={((Number(r.value) || 0) / max) * 100} color={PALETTE[i % PALETTE.length]} />
        ))}
      </div>
    );
  } else if (sec.type === "heatmap") {
    const vals = (sec.data || []).flat().filter((v) => v != null);
    const max = Math.max(1, ...vals);
    body = (
      <div className="overflow-x-auto">
        <table className="text-xs border-separate border-spacing-1">
          <thead>
            <tr>
              <th></th>
              {(sec.cols || []).map((c) => <th key={c} className="px-1 py-1 text-muted-foreground font-medium truncate max-w-20">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {(sec.rows || []).map((r, ri) => (
              <tr key={r}>
                <td className="pr-2 text-right text-muted-foreground font-medium whitespace-nowrap">{r}</td>
                {(sec.cols || []).map((c, ci) => {
                  const v = (sec.data || [])[ri]?.[ci];
                  const t = v == null ? null : Math.max(0, Math.min(1, v / max));
                  return (
                    <td key={c}>
                      <div
                        title={`${r} · ${c}: ${v == null ? "—" : `${v}%`}`}
                        className="h-7 w-10 rounded flex items-center justify-center text-[10px] font-medium"
                        style={{ background: t == null ? "#f3f4f6" : `rgba(44,90,94,${0.12 + 0.85 * t})`, color: t != null && t > 0.5 ? "#fff" : "#374151" }}
                      >
                        {v == null ? "" : Math.round(v)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else if (sec.type === "table") {
    body = (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>{(sec.columns || []).map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>{(sec.columns || []).map((c) => <TableCell key={c.key}>{row[c.key]}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  if (!body) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{sec.title}</CardTitle>
        {sec.type === "heatmap" && data.length ? (
          <button
            type="button"
            onClick={() => downloadHeatmap(sec)}
            className="no-print inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Download PNG"
          >
            <Download className="h-3.5 w-3.5" /> PNG
          </button>
        ) : null}
      </CardHeader>
      <CardContent>{data.length ? body : <p className="text-sm text-muted-foreground">No data</p>}</CardContent>
    </Card>
  );
}

export default function ReportRenderer({ data }) {
  if (!data) return null;
  const kpis = data.kpis || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(kpis).map(([k, v]) => (
          <StatCard key={k} label={v.label || k} value={v.value} unit={v.unit} delta={v.delta} />
        ))}
      </div>
      {data.insights?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.insights.map((s, i) => <Insight key={i}>{s}</Insight>)}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {(data.sections || []).map((sec, i) => <Section key={i} sec={sec} />)}
      </div>
    </div>
  );
}
