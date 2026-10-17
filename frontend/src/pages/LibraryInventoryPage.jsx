import { useState } from "react";
import { useLibraryInventory, useAssessments, useCreateAssessment } from "../hooks/useLibrary";
import { useToast } from "../store/toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const STATUS_VARIANT = { good: "success", damaged: "warning", under_repair: "destructive", lost: "destructive" };
const COND_OPTIONS = ["good", "damaged", "under_repair", "lost", "repaired", "found"];

function StatusBadges({ b }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={STATUS_VARIANT[b.status] || "secondary"}>{t(b.status)}</Badge>
      {b.damaged > 0 && <Badge variant="warning">{b.damaged} {t("damaged")}</Badge>}
      {b.repair > 0 && <Badge variant="destructive">{b.repair} {t("in repair")}</Badge>}
      {b.lost > 0 && <Badge variant="secondary">{b.lost} {t("lost")}</Badge>}
    </div>
  );
}

export default function LibraryInventoryPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = useLibraryInventory();
  const { data: hist } = useAssessments({});
  const create = useCreateAssessment();
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState(null);
  const [form, setForm] = useState({ condition: "damaged", copies: 1, note: "" });

  const totals = data?.data?.totals || {};
  const books = data?.data?.books || [];
  const history = hist?.data || [];

  function openFor(b) { setBook(b); setForm({ condition: "damaged", copies: 1, note: "" }); setOpen(true); }

  async function submit(e) {
    e.preventDefault();
    try {
      await create.mutateAsync({ book_id: book.id, condition: form.condition, copies: Number(form.copies) || 1, note: form.note || undefined });
      toast(t("Saved successfully"), "success"); setOpen(false);
    } catch (err) { toast(err?.error?.message || err?.message || t("Failed to save"), "error"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Book Assessment")}</h1>
        <p className="text-muted-foreground">{t("Book condition, damaged / repair / lost and status updates")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Titles")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.titles ?? "—"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Total copies")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.copies ?? "—"}</p><p className="text-xs text-muted-foreground">{totals.available ?? 0} {t("available")}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("On loan")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.on_loan ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Damaged / repair / lost")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{(totals.damaged || 0) + (totals.repair || 0) + (totals.lost || 0)}</p><p className="text-xs text-muted-foreground">{totals.damaged || 0} · {totals.repair || 0} · {totals.lost || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("Inventory")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">{t("Loading...")}</p> : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("Book")}</TableHead><TableHead>{t("Category")}</TableHead>
                  <TableHead className="text-center">{t("Total")}</TableHead><TableHead className="text-center">{t("Available")}</TableHead>
                  <TableHead className="text-center">{t("On loan")}</TableHead><TableHead>{t("Condition")}</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {books.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{[b.author, b.isbn, b.shelf].filter(Boolean).join(" · ")}</p></TableCell>
                      <TableCell>{b.category || "—"}</TableCell>
                      <TableCell className="text-center">{b.total_copies}</TableCell>
                      <TableCell className="text-center">{b.available_copies}</TableCell>
                      <TableCell className="text-center">{b.on_loan}</TableCell>
                      <TableCell><StatusBadges b={b} />{b.condition_note ? <p className="text-xs text-muted-foreground mt-1">{b.condition_note}</p> : null}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openFor(b)}><ClipboardCheck className="h-4 w-4 mr-1" />{t("Update status")}</Button></TableCell>
                    </TableRow>
                  ))}
                  {books.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-6">{t("No books yet")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("Assessment history")}</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? <p className="text-muted-foreground text-sm">{t("No assessments yet")}</p> : (
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("Date")}</TableHead><TableHead>{t("Book")}</TableHead><TableHead>{t("Condition")}</TableHead>
                  <TableHead className="text-center">{t("Copies")}</TableHead><TableHead>{t("By")}</TableHead><TableHead>{t("Note")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{String(h.created_at).slice(0, 10)}</TableCell>
                      <TableCell>{h.book_title}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[h.condition] || "secondary"}>{t(h.condition)}</Badge></TableCell>
                      <TableCell className="text-center">{h.copies}</TableCell>
                      <TableCell className="text-muted-foreground">{h.assessed_by_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{h.note || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Update book status")} — {book?.title}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Status / condition")}</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">{t("good")}</SelectItem>
                  <SelectItem value="damaged">{t("damaged")}</SelectItem>
                  <SelectItem value="under_repair">{t("under_repair")}</SelectItem>
                  <SelectItem value="lost">{t("lost")}</SelectItem>
                  <SelectItem value="repaired">{t("repaired")}</SelectItem>
                  <SelectItem value="found">{t("found")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("damaged/under_repair/lost reduce available copies; repaired/found return them.")}</p>
            </div>
            <div className="space-y-2"><Label>{t("Copies")}</Label><Input type="number" min="1" value={form.copies} onChange={(e) => setForm({ ...form, copies: e.target.value })} /></div>
            <div className="space-y-2"><Label>{t("Note")}</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit" disabled={create.isPending}>{t("Save")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
