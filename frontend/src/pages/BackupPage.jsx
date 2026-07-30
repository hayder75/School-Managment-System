import { useState } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Download } from "lucide-react";

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);

  async function handleBackup() {
    setLoading(true);
    try {
      const data = await api.get("/operations/backup");
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `sms-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch {} finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Backup & Restore</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Export Backup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Download all school data as JSON</p>
            <Button onClick={handleBackup} disabled={loading}><Download className="h-4 w-4 mr-2" />{loading ? "Exporting..." : "Download Backup"}</Button>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Restore</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload a backup file to restore</p>
            <input type="file" accept=".json" onChange={e => setRestoreFile(e.target.files[0])} className="text-sm" />
            {restoreFile && <Button variant="outline" className="text-destructive" onClick={async () => {
              const text = await restoreFile.text();
              await api.post("/operations/restore", JSON.parse(text));
              alert("Restore complete");
            }}>Restore</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
