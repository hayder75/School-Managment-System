import { useState } from "react";
import { useLibraryCatalog, useMyBorrowings } from "../hooks/useLibrary";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search, BookOpen } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function MyLibraryPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useLibraryCatalog({ search });
  const { data: mine } = useMyBorrowings();
  const books = data?.data || [];
  const borrowings = mine?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Library")}</h1>
        <p className="text-muted-foreground">{t("Browse books and see your loans")}</p>
      </div>

      {borrowings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("My borrowings")}</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>{t("Book")}</TableHead><TableHead>{t("Due")}</TableHead><TableHead>{t("Status")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {borrowings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.book_title}</TableCell>
                      <TableCell>{String(b.due_date).slice(0, 10)}</TableCell>
                      <TableCell>
                        {b.status === "returned" ? <Badge variant="secondary">{t("Returned")}</Badge>
                          : b.days_left < 0 ? <Badge variant="destructive">{t("Overdue")} {Math.abs(b.days_left)}d</Badge>
                            : <Badge variant={b.days_left <= 2 ? "warning" : "success"}>{b.days_left} {t("days left")}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <CardTitle className="text-sm">{t("Browse the library")}</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("Search title, author, ISBN…")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : books.length === 0 ? (
            <p className="text-muted-foreground">{t("No books found")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b) => (
                <div key={b.id} className="rounded-xl border p-3 flex gap-3">
                  <div className="h-12 w-10 rounded bg-muted flex items-center justify-center shrink-0"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.author || "—"}{b.category ? ` · ${b.category}` : ""}</p>
                    <div className="mt-1">
                      {b.is_available
                        ? <Badge variant="success">{t("Available")} ({b.available_copies})</Badge>
                        : <Badge variant="destructive">{t("All copies taken")}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
