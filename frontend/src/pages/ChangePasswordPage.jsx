import { useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useI18n } from "../i18n/I18nContext";

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (form.new_password !== form.confirm_password) {
      setError(t("New passwords do not match"));
      return;
    }
    if (form.new_password.length < 6) {
      setError(t("New password must be at least 6 characters"));
      return;
    }

    setLoading(true);
    try {
      await api.put("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setMessage(t("Password changed successfully"));
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err?.error?.message || err?.message || t("Failed to change password"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Change Password")}</CardTitle>
          <CardDescription>{t("Update your account password")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="space-y-2">
              <Label>{t("Current Password")}</Label>
              <Input type="password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("New Password")}</Label>
              <Input type="password" required value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Confirm New Password")}</Label>
              <Input type="password" required value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Updating...") : t("Update Password")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
