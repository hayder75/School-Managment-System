import { useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../hooks/useUsers";
import { usePayroll } from "../hooks/usePayroll";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Wallet, Briefcase, Phone, Mail } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const money = (v) => (parseFloat(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ALLOWANCE_FIELDS = [
  { key: "transport_allowance", label: "Transport Allowance" },
  { key: "overtime", label: "Overtime" },
  { key: "back_pay", label: "Back Pay" },
  { key: "unit_leader_allowance", label: "Unit Leader Allowance" },
  { key: "department_head_allowance", label: "Department Head Allowance" },
  { key: "housing_allowance", label: "Housing Allowance" },
  { key: "account_allowance", label: "Account Allowance" },
  { key: "phone_allowance", label: "Phone Allowance" },
];

const DEDUCTION_FIELDS = [
  { key: "income_tax", label: "Income Tax" },
  { key: "school_pay", label: "School Pay" },
  { key: "eder", label: "Eder" },
  { key: "office_loan", label: "Office Loan" },
  { key: "cafe_loan", label: "Café Loan" },
  { key: "pension_employee", label: "Pension Con. 7%" },
  { key: "pension_employer", label: "Pension Con. 11%" },
  { key: "ne_starving", label: "N.E. Starving" },
];

export default function StaffDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData, isLoading } = useUser(id);
  const { data: payrollData } = usePayroll({ user_id: id, limit: 500 });
  const [expandedId, setExpandedId] = useState(null);

  const user = userData?.data || {};
  const entries = payrollData?.data || [];
  const latest = entries[0];

  if (isLoading) return <div className="p-8 text-muted-foreground">{t("Loading...")}</div>;
  if (!user.id) return <div className="p-8 text-muted-foreground">{t("Staff member not found")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {user.job_title || user.role} &middot; <Badge variant="outline" className="ml-1">{user.role}</Badge>
            <Badge variant={user.status === "active" ? "success" : user.status === "invited" ? "warning" : "destructive"} className="ml-1">{user.status}</Badge>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("Salary Grade")}</p>
          <p className="font-semibold">{latest?.grade_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{t("Basic")}</p>
          <p className="font-semibold">{latest ? `${money(latest.basic_pay)} ETB` : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4" /> {t("Job")}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">{t("Job Title")}:</span> {user.job_title || "—"}</p>
            <p><span className="text-muted-foreground">{t("Qualification")}:</span> {user.qualification || "—"}</p>
            <p><span className="text-muted-foreground">{t("Field of Study")}:</span> {user.field_of_study || "—"}</p>
            <p><span className="text-muted-foreground">{t("Gender")}:</span> {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "—"}</p>
            <p><span className="text-muted-foreground">{t("Role")}:</span> {user.role}</p>
            {user.role === "teacher" && (
              <>
                <p><span className="text-muted-foreground">{t("Sections")}:</span> {user.section_count ?? "—"}</p>
                <p><span className="text-muted-foreground">{t("Periods / Week")}:</span> {user.periods_per_week ?? "—"}</p>
                <p><span className="text-muted-foreground">{t("OT Periods / Week")}:</span> {user.overtime_periods ?? "—"}</p>
                <p><span className="text-muted-foreground">{t("Total Periods")}:</span> {user.total_periods ?? "—"}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> {t("Contact")}</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" />{user.email || "—"}</p>
            <p className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{user.phone || "—"}</p>
            <p><span className="text-muted-foreground">{t("Joined")}:</span> <EthiopianDate date={user.created_at} /></p>
            <p><span className="text-muted-foreground">{t("Last Login")}:</span> <EthiopianDate date={user.last_login} /></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> {t("Payroll History")}</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No payroll entries recorded")}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>{t("Period")}</TableHead>
                    <TableHead>{t("Basic")}</TableHead>
                    <TableHead>{t("Allowances")}</TableHead>
                    <TableHead>{t("Deductions")}</TableHead>
                    <TableHead>{t("Net Pay")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="w-20">{t("Payslip")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <Fragment key={e.id}>
                      <TableRow>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                            {expandedId === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell>{t(monthNames[e.month - 1])} {e.year}</TableCell>
                        <TableCell>{money(e.basic_pay)}</TableCell>
                        <TableCell>{money(e.allowances_total)}</TableCell>
                        <TableCell>{money(e.deductions_total)}</TableCell>
                        <TableCell className="font-semibold">{money(e.net_pay)}</TableCell>
                        <TableCell><Badge variant={e.status === "paid" ? "success" : e.status === "cancelled" ? "destructive" : "secondary"}>{e.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/api/pdf/payslip/${e.id}`, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === e.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">{t("Allowances")}</p>
                                {ALLOWANCE_FIELDS.map((f) => (
                                  <p key={f.key} className="flex justify-between gap-4"><span>{t(f.label)}</span><span>{money(e[f.key])}</span></p>
                                ))}
                                {e.work_days != null && <p className="flex justify-between gap-4"><span>{t("Work Days")}</span><span>{e.work_days}</span></p>}
                                {e.absent_days != null && <p className="flex justify-between gap-4"><span>{t("Absent Days")}</span><span>{e.absent_days}</span></p>}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">{t("Deductions")}</p>
                                {DEDUCTION_FIELDS.map((f) => (
                                  <p key={f.key} className="flex justify-between gap-4"><span>{t(f.label)}</span><span>{money(e[f.key])}</span></p>
                                ))}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium text-xs uppercase text-muted-foreground">{t("Bank")}</p>
                                <p>{t("Account")}: {e.bank_account || "—"}</p>
                                <p>{t("Bank")}: {e.bank_name || "—"}</p>
                                <p><span className="text-muted-foreground">{t("Grade")}:</span> {e.grade_name || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
