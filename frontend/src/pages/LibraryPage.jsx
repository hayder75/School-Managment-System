import { fullName } from "../lib/fullName";
import { useMemo, useState } from "react";
import { useBooks, useBookCategories, useCreateBook, useUpdateBook, useDeleteBook,
  useBorrowings, useBorrowBook, useReturnBook, useLibrarySettings, useUpdateLibrarySettings,
} from "../hooks/useLibrary";
import api from "../lib/api";
import EntitySearch from "../components/ui/EntitySearch";
import { useToast } from "../store/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const emptyBook = { title: "", author: "", isbn: "", category: "", publisher: "", published_year: "", shelf: "", total_copies: 1, replacement_cost: 0, description: "" };

function dueBadge(b) {
  if (b.status === "returned") return <Badge variant="secondary">Returned</Badge>;
  const d = b.days_left;
  if (d == null) return <Badge variant="outline">—</Badge>;
  if (d < 0) return <Badge variant="destructive">Overdue {Math.abs(d)}d</Badge>;
  if (d === 0) return <Badge variant="warning">Due today</Badge>;
  return <Badge variant={d <= 2 ? "warning" : "success"}>{d} days left</Badge>;
}

function BooksTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const { data: cats } = useBookCategories();
  const { data, isLoading } = useBooks({ search, category: category === "all" ? undefined : category });
  const create = useCreateBook();
  const update = useUpdateBook();
  const del = useDeleteBook();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBook);

  const books = data?.data || [];

  function openNew() { setEditing(null); setForm(emptyBook); setOpen(true); }
  function openEdit(b) { setEditing(b); setForm({ ...emptyBook, ...b, published_year: b.published_year ?? "", total_copies: b.total_copies ?? 1 }); setOpen(true); }

  async function submit(e) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(), author: form.author || undefined, isbn: form.isbn || undefined,
      category: form.category || undefined, publisher: form.publisher || undefined,
      published_year: form.published_year ? Number(form.published_year) : undefined,
      shelf: form.shelf || undefined, description: form.description || undefined,
      total_copies: Number(form.total_copies) || 1, replacement_cost: Number(form.replacement_cost) || 0,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      toast(t("Saved successfully"), "success"); setOpen(false);
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("Search title, author, ISBN, shelf…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("All categories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All categories")}</SelectItem>
            {(cats?.data || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />{t("Add book")}</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("Title")}</TableHead><TableHead>{t("Author")}</TableHead><TableHead>{t("Category")}</TableHead>
              <TableHead>{t("ISBN")}</TableHead><TableHead>{t("Shelf")}</TableHead>
              <TableHead className="text-center">{t("Copies")}</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {books.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.author || "—"}</TableCell>
                  <TableCell>{b.category || "—"}</TableCell>
                  <TableCell>{b.isbn || "—"}</TableCell>
                  <TableCell>{b.shelf || "—"}</TableCell>
                  <TableCell className="text-center">{b.available_copies} / {b.total_copies}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">{t("No books yet")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t("Edit book") : t("Add book")}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("Title")} *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Author")}</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Category")}</Label><Input list="book-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><datalist id="book-cats">{(cats?.data || []).map((c) => <option key={c} value={c} />)}</datalist></div>
              <div className="space-y-2"><Label>{t("ISBN")}</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Publisher")}</Label><Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Published year")}</Label><Input type="number" value={form.published_year} onChange={(e) => setForm({ ...form, published_year: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Shelf / location")}</Label><Input value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Number of copies")}</Label><Input type="number" min="1" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Replacement cost")}</Label><Input type="number" min="0" step="0.01" value={form.replacement_cost} onChange={(e) => setForm({ ...form, replacement_cost: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>{t("Description")}</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit" disabled={create.isPending || update.isPending}>{t("Save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BorrowingsTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [status, setStatus] = useState("borrowed");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useBorrowings({ status: status === "all" ? undefined : status, search });
  const borrow = useBorrowBook();
  const ret = useReturnBook();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ book_id: "", student_id: "", due_date: "", remarks: "", studentLabel: "", bookLabel: "" });
  const [returning, setReturning] = useState(null);
  const [condition, setCondition] = useState("good");
  const [details, setDetails] = useState(null);

  const rows = data?.data || [];

  async function pickStudent(id, o) {
    setForm((f) => ({ ...f, student_id: id, studentLabel: `${o.label}${o.sub ? ` · ${o.sub}` : ""}` }));
    setDetails({ loading: true });
    try {
      const s = await api.get(`/students/${id}`);
      const hist = await api.get("/operations/books/borrowings", { params: { search: s.data.student_number || o.label } });
      const mine = (hist.data || []).filter((h) => h.student_id === id);
      setDetails({ student: s.data, history: mine });
    } catch {
      setDetails(null);
    }
  }

  async function searchStudents(q) {
    const r = await api.get("/students", { params: { search: q || undefined, limit: 20 } });
    return (r.data || []).map((s) => ({
      value: s.id,
      label: `${fullName(s)}`.trim(),
      sub: [s.student_number, s.class_name].filter(Boolean).join(" · "),
    }));
  }
  async function searchBooks(q) {
    const r = await api.get("/operations/books", { params: { search: q || undefined } });
    return (r.data || []).filter((b) => Number(b.available_copies) > 0).map((b) => ({
      value: b.id,
      label: b.title,
      sub: `${b.available_copies} ${t("available")}`,
    }));
  }

  async function doBorrow(e) {
    e.preventDefault();
    try {
      await borrow.mutateAsync({ book_id: form.book_id, student_id: form.student_id, due_date: form.due_date || undefined, remarks: form.remarks || undefined });
      toast(t("Borrowed"), "success"); setOpen(false);
      setForm({ book_id: "", student_id: "", due_date: "", remarks: "", studentLabel: "", bookLabel: "" });
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed"), "error"); }
  }
  async function doReturn() {
    try { await ret.mutateAsync({ id: returning.id, condition }); toast(t("Returned"), "success"); setReturning(null); }
    catch (err) { toast(err?.error?.message || err?.message || t("Failed"), "error"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("Search student, book, phone…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="borrowed">{t("On loan")}</SelectItem>
            <SelectItem value="returned">{t("Returned")}</SelectItem>
            <SelectItem value="all">{t("All")}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{t("Issue book")}</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("Student")}</TableHead><TableHead>{t("Student ID")}</TableHead><TableHead>{t("Book")}</TableHead>
              <TableHead>{t("Borrowed")}</TableHead><TableHead>{t("Due")}</TableHead><TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Fine")}</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.student_name || "—"}</TableCell>
                  <TableCell>{b.student_number || "—"}</TableCell>
                  <TableCell>{b.book_title}</TableCell>
                  <TableCell>{String(b.borrow_date).slice(0, 10)}</TableCell>
                  <TableCell>{String(b.due_date).slice(0, 10)}</TableCell>
                  <TableCell>{dueBadge(b)}</TableCell>
                  <TableCell className="text-right">{Number(b.fine_amount) > 0 ? Number(b.fine_amount).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    {b.status === "borrowed" && <Button size="sm" variant="outline" onClick={() => { setReturning(b); setCondition("good"); }}>{t("Return")}</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground p-6">{t("No records")}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Issue a book")}</DialogTitle></DialogHeader>
          <form onSubmit={doBorrow} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Student")}</Label>
              <EntitySearch
                value={form.student_id}
                valueLabel={form.studentLabel}
                onChange={pickStudent}
                fetchOptions={searchStudents}
                placeholder={t("Search student by name, ID, class…")}
                searchPlaceholder={t("Type a name, student #, or class…")}
              />
            </div>

            {details?.student && (
              <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold">{fullName(details.student)}</span>
                  <span className="text-muted-foreground">{details.student.student_number}</span>
                  <span>{details.student.class_name || "—"}</span>
                  <Badge variant={details.student.status === "active" ? "success" : "secondary"}>{details.student.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("Borrowed")} {details.history.filter((h) => h.status === "borrowed").length} {t("active")} ·{" "}
                  {details.history.filter((h) => h.status === "returned").length} {t("returned")}
                  {details.history.some((h) => h.status === "borrowed" && h.days_left < 0) ? ` · ${t("has overdue")}` : ""}
                </p>
                {details.history.slice(0, 3).map((h) => (
                  <p key={h.id} className="text-xs text-muted-foreground">• {h.book_title} — {h.status}{h.status === "borrowed" ? `, ${h.days_left < 0 ? `${t("overdue")} ${Math.abs(h.days_left)}d` : `${h.days_left} ${t("days left")}`}` : ""}</p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("Book")}</Label>
              <EntitySearch
                value={form.book_id}
                valueLabel={form.bookLabel}
                onChange={(id, o) => setForm({ ...form, book_id: id, bookLabel: `${o.label}${o.sub ? ` · ${o.sub}` : ""}` })}
                fetchOptions={searchBooks}
                placeholder={t("Search book by title, author, ISBN…")}
                searchPlaceholder={t("Type a title or author…")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("Due date")}</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("Remarks")}</Label><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">{t("Leave due date blank to use the default loan period from settings.")}</p>
            <Button type="submit" className="w-full" disabled={borrow.isPending}>{t("Issue")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Return book")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">{returning?.student_name} · {returning?.book_title}</p>
            <div className="space-y-2">
              <Label>{t("Condition")}</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">{t("Good")}</SelectItem>
                  <SelectItem value="damaged">{t("Damaged")}</SelectItem>
                  <SelectItem value="lost">{t("Lost")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReturning(null)}>{t("Cancel")}</Button><Button onClick={doReturn} disabled={ret.isPending}>{t("Confirm return")}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data } = useLibrarySettings();
  const update = useUpdateLibrarySettings();
  const s = data?.data || {};
  const [form, setForm] = useState(null);
  const current = form || {
    loan_days: s.loan_days ?? 14, fine_enabled: !!s.fine_enabled,
    fine_per_day: s.fine_per_day ?? 0, grace_days: s.grace_days ?? 0, default_max_books: s.default_max_books ?? 2,
  };

  async function save(e) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        loan_days: Number(current.loan_days), fine_enabled: !!current.fine_enabled,
        fine_per_day: Number(current.fine_per_day), grace_days: Number(current.grace_days),
        default_max_books: Number(current.default_max_books),
      });
      toast(t("Saved successfully"), "success");
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t("Loan period (days)")}</Label><Input type="number" min="1" value={current.loan_days} onChange={(e) => setForm({ ...current, loan_days: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("Max books per student")}</Label><Input type="number" min="1" value={current.default_max_books} onChange={(e) => setForm({ ...current, default_max_books: e.target.value })} /></div>
      </div>
      <div className="rounded-md border p-3 space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("Charge a fine for late returns")}</span>
          <input type="checkbox" className="h-4 w-4" checked={current.fine_enabled} onChange={(e) => setForm({ ...current, fine_enabled: e.target.checked })} />
        </label>
        {current.fine_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("Fine per day (ETB)")}</Label><Input type="number" min="0" step="0.01" value={current.fine_per_day} onChange={(e) => setForm({ ...current, fine_per_day: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("Grace days")}</Label><Input type="number" min="0" value={current.grace_days} onChange={(e) => setForm({ ...current, grace_days: e.target.value })} /></div>
          </div>
        )}
      </div>
      <Button type="submit" disabled={update.isPending}>{t("Save settings")}</Button>
    </form>
  );
}

export default function LibraryPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Library")}</h1>
        <p className="text-muted-foreground">{t("Manage books, copies, loans and fines")}</p>
      </div>
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">{t("Books")}</TabsTrigger>
          <TabsTrigger value="borrowings">{t("Borrowings")}</TabsTrigger>
          <TabsTrigger value="settings">{t("Settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="books"><BooksTab /></TabsContent>
        <TabsContent value="borrowings"><BorrowingsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
