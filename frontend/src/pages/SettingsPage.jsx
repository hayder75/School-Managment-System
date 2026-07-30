import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Save, Languages } from "lucide-react";

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { lang, switchLang } = useI18n();
  const [form, setForm] = useState({});

  const settings = data?.data || {};

  useEffect(() => {
    if (Object.keys(settings).length > 0 && Object.keys(form).length === 0) {
      setForm({ ...settings });
    }
  }, [settings]);

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    await updateSettings.mutateAsync(form);
  }

  if (isLoading) return <p className="text-muted-foreground p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your school settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>School Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input value={form.school_name || ""} onChange={(e) => handleChange("school_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>School Email</Label>
                <Input value={form.school_email || ""} onChange={(e) => handleChange("school_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.school_phone || ""} onChange={(e) => handleChange("school_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.school_address || ""} onChange={(e) => handleChange("school_address", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={form.currency || "ETB"} onChange={(e) => handleChange("currency", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Week Start Day</Label>
                <Input value={form.week_start_day || "Monday"} onChange={(e) => handleChange("week_start_day", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Academic Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Academic Year</Label>
                <Input value={form.current_academic_year || ""} onChange={(e) => handleChange("current_academic_year", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Current Term</Label>
                <Input value={form.current_term || ""} onChange={(e) => handleChange("current_term", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Passing Grade (%)</Label>
                <Input type="number" value={form.passing_grade || "50"} onChange={(e) => handleChange("passing_grade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Subjects Per Term</Label>
                <Input type="number" value={form.max_subjects || "14"} onChange={(e) => handleChange("max_subjects", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Finance Settings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Late Fee (%)</Label>
                <Input type="number" value={form.default_late_fee_pct || "5"} onChange={(e) => handleChange("default_late_fee_pct", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default Payment Method</Label>
                <Input value={form.default_payment_method || "cash"} onChange={(e) => handleChange("default_payment_method", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Enable Partial Payments</Label>
                <Input value={form.enable_partial_payments || "true"} onChange={(e) => handleChange("enable_partial_payments", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader><CardTitle><Languages className="h-5 w-5 inline mr-2" />Language Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Interface Language</Label>
                <div className="flex gap-4">
                  <Button
                    variant={lang === "en" ? "default" : "outline"}
                    onClick={() => switchLang("en")}
                    className="w-32"
                  >
                    English
                  </Button>
                  <Button
                    variant={lang === "am" ? "default" : "outline"}
                    onClick={() => switchLang("am")}
                    className="w-32"
                  >
                    አማርኛ
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Current language: <strong>{lang === "en" ? "English" : "አማርኛ"}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
