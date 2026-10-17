import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useClasses } from "../hooks/useClasses";
import {
  useSmsStats, useSmsConfig, useUpdateSmsConfig, useSmsCampaigns,
  useSmsPreview, useCreateSmsCampaign, useCancelSmsCampaign, useProcessSms,
} from "../hooks/useSms";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MessageSquare, Send, Users, AlertTriangle, Play, XCircle, RefreshCw } from "lucide-react";

const TEMPLATES = [
  { id: "test", label: "Test / exam due", body: "Dear parent, this is a reminder that a test is scheduled for {class}. Please make sure your child is well prepared. — Mount Olive School" },
  { id: "results", label: "Results available", body: "Dear parent, your child's exam results are now available. Please check the parent portal or contact the school. — Mount Olive School" },
  { id: "absence", label: "Absence notice", body: "Dear parent, {student} was marked absent today. Please contact the school office. — Mount Olive School" },
  { id: "fee", label: "Fee reminder", body: "Dear parent, kindly settle the outstanding school fee at your earliest convenience. — Mount Olive School" },
  { id: "meeting", label: "Parent meeting", body: "Dear parent, you are invited to a parent–teacher meeting. Please contact the school for the date and time. — Mount Olive School" },
  { id: "holiday", label: "Holiday notice", body: "Dear parent, please note the school will be closed for the upcoming holiday. Classes resume on the next working day. — Mount Olive School" },
  { id: "custom", label: "Custom message", body: "" },
];

export default function SmsPage() {
  const { t } = useI18n();
  const { data: classesData } = useClasses({ limit: 300 });
  const classes = classesData?.data || [];

  const { data: statsData } = useSmsStats();
  const { data: configData } = useSmsConfig();
  const { data: campaignsData, isLoading: loadingCampaigns } = useSmsCampaigns();
  const createCampaign = useCreateSmsCampaign();
  const cancelCampaign = useCancelSmsCampaign();
  const processSms = useProcessSms();
  const updateConfig = useUpdateSmsConfig();

  const stats = statsData?.data || {};
  const config = configData?.data || stats.config || {};
  const campaigns = campaignsData?.data || [];

  const [classId, setClassId] = useState("__all__");
  const [templateId, setTemplateId] = useState("test");
  const [title, setTitle] = useState("Test / exam reminder");
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const previewClassId = classId && classId !== "__all__" ? classId : null;
  const { data: previewData } = useSmsPreview(previewClassId);
  const recipientCount = previewData?.data?.count ?? 0;

  const className = useMemo(
    () => (previewClassId ? classes.find((c) => c.id === previewClassId)?.name : t("All classes")),
    [previewClassId, classes, t]
  );

  function applyTemplate(id) {
    setTemplateId(id);
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (tpl) setMessage(tpl.body);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(""); setNotice("");
    if (!message.trim()) { setError(t("Please write a message.")); return; }
    try {
      const res = await createCampaign.mutateAsync({
        title: title.trim() || "SMS broadcast",
        message: message.trim(),
        class_id: previewClassId,
      });
      const camp = res?.data || {};
      setNotice(
        t("Queued for {n} recipient(s).", { n: camp.total_recipients ?? 0 })
      );
    } catch (err) {
      setError(err?.error?.message || err?.message || t("Could not create the campaign."));
    }
  }

  const testMode = config.test_mode !== false;
  const enabled = config.enabled === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> {t("SMS Messaging")}
          </h1>
          <p className="text-muted-foreground">{t("Send announcements to parents by SMS. Messages are queued and sent within the daily limit.")}</p>
        </div>
      </div>

      {/* Safety banners */}
      {!enabled && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {t("Sending is currently OFF. Campaigns are queued but nothing is dispatched until it is enabled.")}
        </div>
      )}
      {enabled && testMode && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {t("TEST MODE — every message is routed to {phone} only.", { phone: config.test_phone || "0932123090" })}
        </div>
      )}

      {/* Quota */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Sent today")}</p><p className="text-2xl font-bold">{stats.sent_today ?? 0} <span className="text-base font-normal text-muted-foreground">/ {stats.daily_limit ?? 999}</span></p></div>
          <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Send className="h-4 w-4" /></span>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Remaining today")}</p><p className="text-2xl font-bold">{stats.remaining_today ?? 0}</p></div>
          <span className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><RefreshCw className="h-4 w-4" /></span>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("In queue")}</p><p className="text-2xl font-bold">{stats.queued ?? 0}</p></div>
          <span className="h-9 w-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Users className="h-4 w-4" /></span>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("New message")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{t("Class")}</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("All classes")}</SelectItem>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Template")}</Label>
                  <Select value={templateId} onValueChange={applyTemplate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map((tpl) => <SelectItem key={tpl.id} value={tpl.id}>{t(tpl.label)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("Title")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Subject of the campaign")} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("Message")}</Label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t("Type your message… use {student} and {class} as placeholders.")}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Placeholders: {student}, {class}")}</span>
                  <span>{message.length} {t("chars")} · {Math.max(1, Math.ceil(message.length / 160))} {t("SMS parts")}</span>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {t("Recipients")}: <span className="font-semibold">{recipientCount}</span> · <span className="text-muted-foreground">{className}</span>
              </div>

              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-2.5 rounded-lg">{error}</div>}
              {notice && <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-2.5 rounded-lg">{notice}</div>}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={createCampaign.isPending} className="gap-2">
                  <Send className="h-4 w-4" /> {createCampaign.isPending ? t("Queuing…") : t("Queue campaign")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Sending settings")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>{t("Sending enabled")}</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => updateConfig.mutate({ enabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>{t("Test mode (route to test phone)")}</span>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => updateConfig.mutate({ test_mode: e.target.checked })}
              />
            </label>
            <div className="space-y-1">
              <Label className="text-xs">{t("Test phone")}</Label>
              <Input
                defaultValue={config.test_phone || ""}
                onBlur={(e) => updateConfig.mutate({ test_phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Sender name")}</Label>
              <Input
                defaultValue={config.from_name || ""}
                onBlur={(e) => updateConfig.mutate({ from_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Daily limit")}</Label>
              <Input
                type="number"
                defaultValue={config.daily_limit || 999}
                onBlur={(e) => updateConfig.mutate({ daily_limit: Number(e.target.value) || 999 })}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {config.has_api_key ? t("Afro SMS API key: configured") : t("Afro SMS API key: not set")}
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => processSms.mutate({})}
              disabled={processSms.isPending || !enabled}
              title={!enabled ? t("Enable sending first") : ""}
            >
              <Play className="h-4 w-4" /> {processSms.isPending ? t("Processing…") : t("Process queue now")}
            </Button>
            {processSms.data?.data && (
              <p className="text-xs text-muted-foreground">
                {processSms.data.data.skipped
                  ? t("Skipped: {reason}", { reason: processSms.data.data.skipped })
                  : t("Sent {sent}, failed {failed}.", { sent: processSms.data.data.sent ?? 0, failed: processSms.data.data.failed ?? 0 })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("Campaigns")}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">{t("Title")}</th>
              <th className="p-3 font-medium">{t("Class")}</th>
              <th className="p-3 font-medium text-right">{t("Recipients")}</th>
              <th className="p-3 font-medium text-right">{t("Sent")}</th>
              <th className="p-3 font-medium text-right">{t("Failed")}</th>
              <th className="p-3 font-medium">{t("Status")}</th>
              <th className="p-3 font-medium">{t("Created")}</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.title}{c.test_mode ? <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{t("TEST")}</span> : null}</td>
                  <td className="p-3">{c.class_name || t("All classes")}</td>
                  <td className="p-3 text-right">{c.total_recipients}</td>
                  <td className="p-3 text-right text-emerald-700">{c.sent_count}</td>
                  <td className="p-3 text-right text-rose-700">{c.failed_count}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === "completed" ? "bg-green-100 text-green-700" : c.status === "cancelled" ? "bg-neutral-200 text-neutral-600" : "bg-blue-100 text-blue-700"}`}>{t(c.status)}</span></td>
                  <td className="p-3 text-xs text-muted-foreground">{String(c.created_at || "").slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3 text-right">
                    {(c.status === "queued" || c.status === "processing") && (
                      <Button size="sm" variant="ghost" onClick={() => cancelCampaign.mutate(c.id)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> {t("Cancel")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!campaigns.length && !loadingCampaigns && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{t("No campaigns yet")}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}