import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  ScanFace, UserPlus, Settings as SettingsIcon, CalendarCheck, CheckCircle2, XCircle,
  Trash2, Camera, Clock, AlertTriangle, Loader2, RefreshCw,
} from "lucide-react";
import {
  loadFaceModels, detectFace, detectLandmarks, eyeAspectRatio, newBlinkState,
  updateBlinkTracker, faceQuality,
} from "../lib/face";

const MODES = [
  { id: "scan", label: "Scan", icon: ScanFace },
  { id: "enroll", label: "Register face", icon: UserPlus },
  { id: "exception", label: "Exceptions", icon: AlertTriangle },
  { id: "today", label: "Today", icon: CalendarCheck },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

function fullName(s) {
  return [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(" ") || "—";
}

export default function FaceAttendancePage() {
  const { t } = useI18n();
  const [mode, setMode] = useState("scan");
  const [session, setSession] = useState(() => new Date().getHours() < 12 ? "am" : "pm");
  const [modelsReady, setModelsReady] = useState(false);
  const [camError, setCamError] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(null);
  const [today, setToday] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const blinkRef = useRef(newBlinkState());
  const lastScanRef = useRef(0);
  const scanningRef = useRef(false);
  const lastDetectRef = useRef(0);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadSettings = useCallback(async () => {
    try { const res = await api.get("/face-attendance/settings"); setSettings(res.data); }
    catch (e) { setError(e?.message || "Could not load settings"); }
  }, []);
  const loadToday = useCallback(async () => {
    try { const res = await api.get("/face-attendance/today"); setToday(res.data); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSettings(); loadToday(); }, [loadSettings, loadToday]);
  useEffect(() => { loadFaceModels().then(() => setModelsReady(true)).catch((e) => setCamError(e?.message || "Could not load face models")); }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setCamError("Camera unavailable. Allow camera access in the browser and try again.");
    }
  }, []);

  // Camera lifecycle for camera modes.
  useEffect(() => {
    if (mode === "scan" || mode === "enroll") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  const doScan = useCallback(async (descriptor) => {
    scanningRef.current = true;
    try {
      const res = await api.post("/face-attendance/scan", {
        descriptor,
        session: sessionRef.current,
        livenessPassed: true,
        deviceInfo: navigator.userAgent,
      });
      setResult(res.data);
      loadToday();
    } catch (e) {
      setResult({ matched: false, message: e?.error?.message || e?.message || "Scan failed" });
    } finally {
      setTimeout(() => { scanningRef.current = false; }, 1500);
    }
  }, [loadToday]);

  const drawOverlay = useCallback((face) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);
    if (!face) return;
    const sx = cw / (video.videoWidth || cw);
    const sy = ch / (video.videoHeight || ch);
    const { x, y, width, height } = face.box;
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x * sx, y * sy, width * sx, height * sy);
  }, []);

  // Live detection + blink liveness loop (scan mode only).
  useEffect(() => {
    if (mode !== "scan" || !modelsReady) return undefined;
    let active = true;
    const loop = async () => {
      if (!active) return;
      const now = performance.now();
      if (now - lastDetectRef.current > 150 && !scanningRef.current) {
        lastDetectRef.current = now;
        try {
          const face = await detectLandmarks(videoRef.current, { minScore: 0.45 });
          drawOverlay(face);
          if (face) {
            const ear = eyeAspectRatio(face.landmarks);
            const blinked = updateBlinkTracker(blinkRef.current, ear);
            if (blinked && performance.now() - lastScanRef.current > 3000) {
              lastScanRef.current = performance.now();
              const full = await detectFace(videoRef.current, { minScore: 0.5 });
              if (full?.descriptor) {
                blinkRef.current = newBlinkState();
                doScan(full.descriptor);
              }
            }
          }
        } catch { /* transient */ }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [mode, modelsReady, drawOverlay, doScan]);

  const sessionLabel = session === "am" ? t("Morning (AM)") : t("Afternoon (PM)");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanFace className="h-6 w-6 text-primary" /> {t("Face Attendance")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("Scan staff faces to mark attendance. Use the toggle to switch morning/afternoon.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("Session")}</span>
          <Button
            size="lg"
            variant={session === "am" ? "default" : "secondary"}
            className="gap-2"
            onClick={() => setSession((s) => (s === "am" ? "pm" : "am"))}
          >
            <Clock className="h-4 w-4" /> {sessionLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button key={m.id} variant={mode === m.id ? "default" : "outline"} onClick={() => setMode(m.id)} className="gap-2">
            <m.icon className="h-4 w-4" /> {t(m.label)}
          </Button>
        ))}
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-md p-2.5">{error}</div>}

      {(mode === "scan" || mode === "enroll") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                {!modelsReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading face models…")}
                  </div>
                )}
                {camError && <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-sm px-6 text-center">{camError}</div>}
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                <Camera className="h-3.5 w-3.5" />
                {mode === "scan"
                  ? t("Look at the camera and blink once to verify.")
                  : t("Capture 3–5 clear samples of the staff member's face.")}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {mode === "scan" && (
              <Card><CardContent className="p-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Last scan")}</p>
                {!result && <p className="text-sm text-muted-foreground">{t("Waiting for a face…")}</p>}
                {result && <ScanResult result={result} />}
              </CardContent></Card>
            )}
            {mode === "enroll" && (
              <EnrollPanel modelsReady={modelsReady} videoRef={videoRef} onSaved={loadToday} />
            )}
          </div>
        </div>
      )}

      {mode === "exception" && <ExceptionPanel session={session} onSaved={() => { loadToday(); }} />}
      {mode === "today" && <TodayPanel today={today} onRefresh={loadToday} />}
      {mode === "settings" && <SettingsPanel settings={settings} onSaved={loadSettings} />}
    </div>
  );
}

function ScanResult({ result }) {
  const { t } = useI18n();
  const ok = result.matched;
  const tone = ok
    ? result.action === "CHECK_IN" || result.action === "CHECK_OUT"
      ? "emerald"
      : "amber"
    : "rose";
  const cls = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="flex items-center gap-2 font-medium">
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {ok ? fullName(result.staff) : t("Face not recognised")}
      </div>
      <p className="text-sm mt-1">{result.message}</p>
      {ok && (
        <p className="text-xs mt-1 opacity-80">
          {String(result.session || "").toUpperCase()} · {result.time}
          {result.status ? ` · ${result.status}` : ""}
        </p>
      )}
    </div>
  );
}

function EnrollPanel({ modelsReady, videoRef, onSaved }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [descriptors, setDescriptors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const searchStaff = async () => {
    try { const res = await api.get("/face-attendance/staff", { params: { search: search || undefined } }); setStaff(res.data || []); }
    catch (e) { setMsg(e?.message || "Search failed"); }
  };
  useEffect(() => { searchStaff(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { setDescriptors([]); setMsg(""); }, [selected?.id]);

  const capture = async () => {
    if (!modelsReady || !videoRef.current) return;
    setMsg("");
    const face = await detectFace(videoRef.current, { minScore: 0.55 });
    if (!face?.descriptor) { setMsg(t("No face detected. Hold still and try again.")); return; }
    const q = faceQuality(face, videoRef.current);
    setDescriptors((d) => [...d, { descriptor: face.descriptor, quality: q }]);
  };

  const save = async () => {
    if (!selected || descriptors.length === 0) return;
    setBusy(true); setMsg("");
    try {
      await api.post(`/face-attendance/staff/${selected.id}/enroll`, { descriptors: descriptors.map((d) => d.descriptor) });
      setMsg(t("Face saved for {name}.", { name: fullName(selected) }));
      setDescriptors([]);
      searchStaff();
      onSaved?.();
    } catch (e) {
      setMsg(e?.error?.message || e?.message || "Could not save face");
    } finally { setBusy(false); }
  };

  const clear = async () => {
    if (!selected) return;
    setBusy(true);
    try { await api.delete(`/face-attendance/staff/${selected.id}`); setMsg(t("Enrolled faces removed.")); searchStaff(); }
    catch (e) { setMsg(e?.message || "Could not remove"); }
    finally { setBusy(false); }
  };

  return (
    <Card><CardContent className="p-4 space-y-3">
      <p className="text-md font-medium flex items-center gap-2"><UserPlus className="h-4 w-4" /> {t("Register a staff face")}</p>
      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search staff name…")} onKeyDown={(e) => e.key === "Enter" && searchStaff()} />
        <Button variant="outline" onClick={searchStaff}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
        {staff.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelected(s)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${selected?.id === s.id ? "bg-muted font-medium" : "hover:bg-muted/50"}`}>
            <span>{fullName(s)}<span className="block text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, " ")}</span></span>
            <span className={`text-xs ${s.enrolled_count > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {s.enrolled_count > 0 ? `${s.enrolled_count} ${t("samples")}` : t("not enrolled")}
            </span>
          </button>
        ))}
        {!staff.length && <p className="p-3 text-sm text-muted-foreground">{t("No staff found")}</p>}
      </div>

      {selected && (
        <div className="space-y-2">
          <p className="text-sm">{t("Selected")}: <span className="font-medium">{fullName(selected)}</span></p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={capture} disabled={!modelsReady} className="gap-2"><Camera className="h-4 w-4" /> {t("Capture sample")} ({descriptors.length})</Button>
            <Button onClick={save} disabled={busy || !descriptors.length}>{busy ? t("Saving…") : t("Save face")}</Button>
            <Button variant="outline" onClick={clear} disabled={busy} className="gap-1"><Trash2 className="h-4 w-4" /> {t("Clear")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("Tip: capture 3–5 samples, looking straight, slightly left and slightly right.")}</p>
        </div>
      )}
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">{msg}</div>}
    </CardContent></Card>
  );
}

function ExceptionPanel({ session, onSaved }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("leave");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const searchStaff = async () => {
    try { const res = await api.get("/face-attendance/staff", { params: { search: search || undefined } }); setStaff(res.data || []); }
    catch (e) { setMsg(e?.message || "Search failed"); }
  };
  useEffect(() => { searchStaff(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!selected) return;
    setBusy(true); setMsg("");
    try {
      await api.post("/face-attendance/exception", { staffId: selected.id, session, status });
      setMsg(t("Marked {name} as {status} for the {session} session.", { name: fullName(selected), status: t(status === "leave" ? "Leave" : "Emergency"), session: session.toUpperCase() }));
      onSaved?.();
    } catch (e) { setMsg(e?.error?.message || e?.message || "Could not save"); }
    finally { setBusy(false); }
  };

  return (
    <Card><CardContent className="p-4 space-y-3 max-w-2xl">
      <p className="text-md font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("Mark leave / emergency for a session")}</p>
      <p className="text-xs text-muted-foreground">{t("Current session")}: <span className="font-medium">{session.toUpperCase()}</span>. {t("Change the session toggle at the top.")}</p>
      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search staff name…")} onKeyDown={(e) => e.key === "Enter" && searchStaff()} />
        <Button variant="outline" onClick={searchStaff}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
        {staff.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelected(s)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${selected?.id === s.id ? "bg-muted font-medium" : "hover:bg-muted/50"}`}>
            <span>{fullName(s)}<span className="block text-xs text-muted-foreground capitalize">{s.role?.replace(/_/g, " ")}</span></span>
          </button>
        ))}
        {!staff.length && <p className="p-3 text-sm text-muted-foreground">{t("No staff found")}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("Status")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="leave">{t("Leave")}</SelectItem>
              <SelectItem value="emergency">{t("Emergency")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={!selected || busy}>{busy ? t("Saving…") : t("Mark")}</Button>
      </div>
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">{msg}</div>}
    </CardContent></Card>
  );
}

function TodayPanel({ today, onRefresh }) {
  const { t } = useI18n();
  const rows = today?.attendance || [];
  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-md font-medium flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> {t("Today")} · {today?.date || ""} {today?.time ? `(${today.time})` : ""}</p>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /> {t("Refresh")}</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="border-b bg-muted/50 text-left">
            <th className="p-2 font-medium">{t("Staff")}</th>
            <th className="p-2 font-medium">{t("Session")}</th>
            <th className="p-2 font-medium">{t("Status")}</th>
            <th className="p-2 font-medium">{t("In")}</th>
            <th className="p-2 font-medium">{t("Out")}</th>
            <th className="p-2 font-medium">{t("Source")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{fullName(r)}</td>
                <td className="p-2 uppercase">{r.session}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "present" ? "bg-emerald-100 text-emerald-700" : r.status === "late" ? "bg-amber-100 text-amber-700" : r.status === "absent" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>{r.status}</span>
                  {r.late_minutes > 0 && <span className="text-xs text-muted-foreground"> · {r.late_minutes}m</span>}
                </td>
                <td className="p-2">{r.check_in || "—"}</td>
                <td className="p-2">{r.check_out || "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{r.source || "manual"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t("No attendance recorded yet today.")}</td></tr>}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}

function SettingsPanel({ settings, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(settings || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { setForm(settings || {}); }, [settings]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true); setMsg("");
    try {
      await api.put("/face-attendance/settings", {
        match_threshold: Number(form.match_threshold),
        match_margin: Number(form.match_margin),
        liveness_required: !!form.liveness_required,
        am_start: form.am_start,
        pm_start: form.pm_start,
        late_grace_minutes: Number(form.late_grace_minutes),
        timezone: form.timezone,
      });
      setMsg(t("Settings saved."));
      onSaved?.();
    } catch (e) { setMsg(e?.error?.message || e?.message || "Could not save settings"); }
    finally { setBusy(false); }
  };

  if (!settings) return <Card><CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t("Loading…")}</CardContent></Card>;

  return (
    <Card><CardContent className="p-4 space-y-4 max-w-3xl">
      <p className="text-md font-medium flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> {t("Face attendance settings")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-xs">{t("Morning (AM) start")}</Label><Input type="time" value={form.am_start || "08:00"} onChange={(e) => set("am_start", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t("Afternoon (PM) start")}</Label><Input type="time" value={form.pm_start || "13:30"} onChange={(e) => set("pm_start", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t("Grace minutes (both)")}</Label><Input type="number" min="0" value={form.late_grace_minutes ?? 30} onChange={(e) => set("late_grace_minutes", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t("Timezone")}</Label><Input value={form.timezone || "Africa/Addis_Ababa"} onChange={(e) => set("timezone", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t("Match threshold")}</Label><Input type="number" step="0.01" value={form.match_threshold ?? 0.5} onChange={(e) => set("match_threshold", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">{t("Match margin")}</Label><Input type="number" step="0.01" value={form.match_margin ?? 0.05} onChange={(e) => set("match_margin", e.target.value)} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.liveness_required} onChange={(e) => set("liveness_required", e.target.checked)} />
        {t("Require blink liveness")}
      </label>
      <Button onClick={save} disabled={busy}>{busy ? t("Saving…") : t("Save settings")}</Button>
      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">{msg}</div>}
    </CardContent></Card>
  );
}