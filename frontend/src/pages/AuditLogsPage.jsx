import { useState } from "react";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function AuditLogsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const { data, isLoading } = useAuditLogs({ page, limit: 20, action, entity_type: entityType });

  const logs = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-8 w-8" /> {t("Audit Logs")}</h1>
        <p className="text-muted-foreground">{t("Track all system activities")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("Filters")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>{t("Action")}</Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder={t("All actions")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("All")}</SelectItem>
                  <SelectItem value="create">{t("Create")}</SelectItem>
                  <SelectItem value="update">{t("Update")}</SelectItem>
                  <SelectItem value="delete">{t("Delete")}</SelectItem>
                  <SelectItem value="login">{t("Login")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Entity")}</Label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder={t("All entities")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("All")}</SelectItem>
                  <SelectItem value="user">{t("User")}</SelectItem>
                  <SelectItem value="student">{t("Student")}</SelectItem>
                  <SelectItem value="class">{t("Class")}</SelectItem>
                  <SelectItem value="exam">{t("Exam")}</SelectItem>
                  <SelectItem value="payment">{t("Payment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("Activity Log")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("User")}</TableHead>
                    <TableHead>{t("Action")}</TableHead>
                    <TableHead>{t("Entity")}</TableHead>
                    <TableHead>{t("Date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.first_name} {log.last_name}</TableCell>
                      <TableCell>
                        <Badge variant={log.action === "create" ? "success" : log.action === "delete" ? "destructive" : "secondary"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entity_type} {log.entity_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-muted-foreground"><EthiopianDate date={log.created_at} /></TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("No activity yet")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{t("Page")} {meta.page} {t("of")} {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("Previous")}</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("Next")}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
