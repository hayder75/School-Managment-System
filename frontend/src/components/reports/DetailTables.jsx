import { useState, useEffect, useMemo } from "react";
import { useReportDetail } from "../../hooks/useReporting";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/I18nContext";

function cell(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(v);
}

export function DataTable({ title, columns = [], rows = [], total = 0, page = 1, limit = 25, onPage, search, onSearch, tableNames = [], activeTable, onSelectTable, loading, truncated }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / limit));
  // Hide columns that are entirely empty (e.g. names stripped from a shared report)
  const visibleCols = useMemo(() => columns.filter((c) => rows.some((r) => r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== "")), [columns, rows]);
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm">{title || t("Details")} <span className="text-muted-foreground font-normal">({total.toLocaleString()})</span></CardTitle>
          <Input className="w-64 h-9" placeholder={t("Search...")} value={search} onChange={(e) => { onSearch(e.target.value); onPage(1); }} />
        </div>
        {tableNames.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tableNames.map((tb) => (
              <Button key={tb.name} size="sm" variant={activeTable === tb.name ? "default" : "outline"} onClick={() => { onSelectTable(tb.name); onPage(1); }}>
                {tb.name} <span className="ml-1 opacity-70">({tb.total})</span>
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("Loading...")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("No records")}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>{visibleCols.map((c) => <TableHead key={c.key} className="whitespace-nowrap">{c.header}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>{visibleCols.map((c) => <TableCell key={c.key} className="whitespace-nowrap">{cell(r[c.key])}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {t("Showing")} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total.toLocaleString()}
                {truncated ? ` · ${t("showing first")} ${rows.length}` : ""}
              </p>
              {pages > 1 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t("Previous")}</Button>
                  <span className="text-xs text-muted-foreground self-center">{page} / {pages}</span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t("Next")}</Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DetailTables({ reportId, filters }) {
  const [table, setTable] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => { setTable(null); setPage(1); setSearch(""); }, [reportId, filters?.from, filters?.to]);

  const { data, isLoading } = useReportDetail(reportId, filters, { table, page, search });
  const d = data?.data;
  if (!d || (!d.tables?.length && !d.rows?.length)) return null;

  return (
    <DataTable
      title={d.name}
      columns={d.columns || []}
      rows={d.rows || []}
      total={d.total || 0}
      page={d.page || 1}
      limit={d.limit || 25}
      onPage={setPage}
      search={search}
      onSearch={setSearch}
      tableNames={d.tables || []}
      activeTable={d.name}
      onSelectTable={setTable}
      loading={isLoading}
    />
  );
}

export function StaticTables({ tables }) {
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  if (!tables?.length) return null;
  const tb = tables[active] || tables[0];
  const filtered = search
    ? tb.rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : tb.rows;
  const limit = 25;
  const paged = filtered.slice((page - 1) * limit, page * limit);
  return (
    <DataTable
      title={tb.table}
      columns={tb.columns || []}
      rows={paged}
      total={filtered.length}
      page={page}
      limit={limit}
      onPage={setPage}
      search={search}
      onSearch={(s) => { setSearch(s); setPage(1); }}
      tableNames={tables.map((t) => ({ name: t.table, total: t.total ?? t.rows.length }))}
      activeTable={tb.table}
      onSelectTable={(name) => { setActive(tables.findIndex((t) => t.table === name)); setPage(1); }}
      truncated={tb.truncated && !search}
    />
  );
}
