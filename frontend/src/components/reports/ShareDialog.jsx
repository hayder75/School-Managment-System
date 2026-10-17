import { useState } from "react";
import { useCreateReportShare } from "../../hooks/useReporting";
import { useToast } from "../../store/toast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Check, Copy, Link2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function defaultExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function ShareDialog({ open, onOpenChange, reportId, title, filters }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const create = useCreateReportShare();
  const [expiry, setExpiry] = useState(defaultExpiry());
  const [includeNames, setIncludeNames] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      const res = await create.mutateAsync({
        reportId,
        title,
        filters,
        includeNames,
        expiresAt: expiry ? `${expiry}T23:59:59.000Z` : null,
      });
      setLink(`${window.location.origin}${res.data.url}`);
      toast(t("Share link created"), "success");
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Failed to create link"), "error");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setLink(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" /> {t("Share this report")}</DialogTitle>
          <DialogDescription>{t("Anyone with the link can view a snapshot of this report — no login needed.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Link expires on")}</Label>
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("After this date the link stops working. Leave blank for no expiry.")}</p>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">{t("What the recipient can see")}</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" className="mt-1" checked={!includeNames} onChange={() => setIncludeNames(false)} />
              <span>
                <span className="font-medium">{t("Aggregates only")}</span>
                <span className="block text-xs text-muted-foreground">{t("Numbers, rates and charts — no names, emails or phone numbers.")}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" className="mt-1" checked={includeNames} onChange={() => setIncludeNames(true)} />
              <span>
                <span className="font-medium">{t("Include names")}</span>
                <span className="block text-xs text-muted-foreground">{t("Include staff/student names in the shared data.")}</span>
              </span>
            </label>
          </div>

          {link ? (
            <div className="space-y-2">
              <Label>{t("Share link")}</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} onFocus={(e) => e.target.select()} />
                <Button onClick={copy} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("You can revoke this link anytime from the shares list.")}</p>
            </div>
          ) : (
            <Button className="w-full" onClick={share} disabled={create.isPending}>
              {create.isPending ? t("Creating...") : t("Create share link")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
