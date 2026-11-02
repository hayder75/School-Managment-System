import React from "react";
import * as faceapi from "@vladmandic/face-api";

const { useState, useEffect, useRef, useCallback } = React;

const MODELS_URI = "/face-models";

async function api(path, options = {}) {
  const res = await fetch(`/api/face-attendance${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.status === 401) {
    window.location.href = "/auth/login";
    throw new Error("Session expired");
  }
  if (!res.ok || (body && body.success === false)) {
    throw new Error((body && body.error && body.error.message) || res.statusText || "Request failed");
  }
  return body ? body.data : null;
}

let modelsPromise = null;
function loadModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      for (const backend of ["webgl", "cpu"]) {
        try {
          if (await faceapi.tf.setBackend(backend)) break;
        } catch {
          /* try next backend */
        }
      }
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI),
      ]);
    })().catch((err) => {
      modelsPromise = null;
      throw err;
    });
  }
  return modelsPromise;
}

function fullName(staff) {
  if (!staff) return "";
  return [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(" ");
}

const card = "rounded-xl border bg-card p-4 shadow-sm";
const input =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:opacity-90`;
const btnOutline = `${btn} border border-input bg-background hover:bg-muted`;
const btnDanger = `${btn} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`;

function CameraCard({ videoRef, canvasRef, modelsReady, modelError, cameraError }) {
  return (
    <div className={`${card} space-y-3`}>
      <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {!modelsReady && !modelError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
            Loading face models…
          </div>
        )}
        {modelError && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-rose-300">
            {modelError}
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-rose-300">
            {cameraError}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Look at the camera. Attendance is recorded automatically when a face is recognised.
      </p>
    </div>
  );
}

function ScanPanel({ videoRef, canvasRef, modelsReady, session, onScanned }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const scanning = useRef(false);
  const locked = useRef(false);
  const noFaceAt = useRef(0);
  const pauseUntil = useRef(0);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const drawBox = useCallback(
    (box) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const width = video.clientWidth;
      const height = video.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      if (!box) return;
      const sx = width / (video.videoWidth || width);
      const sy = height / (video.videoHeight || height);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x * sx, box.y * sy, box.width * sx, box.height * sy);
    },
    [videoRef, canvasRef]
  );

  const doScan = useCallback(
    async (force) => {
      if (!modelsReady || scanning.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      if (!force && (locked.current || Date.now() < pauseUntil.current)) return;

      scanning.current = true;
      setBusy(true);
      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
        );
        if (!detection) {
          drawBox(null);
          return;
        }
        drawBox(detection.box);

        const full = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!full || !full.descriptor) return;

        const data = await api("/scan", {
          method: "POST",
          body: JSON.stringify({
            descriptor: Array.from(full.descriptor),
            session: sessionRef.current,
            livenessPassed: true,
            deviceInfo: navigator.userAgent,
          }),
        });
        setResult(data);
        if (data && data.matched) {
          locked.current = true;
          noFaceAt.current = 0;
          pauseUntil.current = Date.now() + 4000;
          if (onScanned) onScanned();
        } else {
          pauseUntil.current = Date.now() + 2500;
        }
      } catch (err) {
        setResult({ matched: false, message: err.message || "Scan failed" });
        pauseUntil.current = Date.now() + 2500;
      } finally {
        scanning.current = false;
        setBusy(false);
      }
    },
    [modelsReady, videoRef, drawBox, onScanned]
  );

  useEffect(() => {
    if (!modelsReady) return;
    let alive = true;
    let timer = null;

    const tick = async () => {
      if (!alive) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !scanning.current) {
        if (locked.current) {
          try {
            const detection = await faceapi.detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.35 })
            );
            if (detection) {
              noFaceAt.current = 0;
              drawBox(detection.box);
            } else {
              drawBox(null);
              if (!noFaceAt.current) noFaceAt.current = Date.now();
              else if (Date.now() - noFaceAt.current > 1500) {
                locked.current = false;
                noFaceAt.current = 0;
              }
            }
          } catch {
            /* ignore detection errors */
          }
        } else {
          await doScan(false);
        }
      }
      if (alive) timer = setTimeout(tick, 700);
    };

    timer = setTimeout(tick, 900);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [modelsReady, doScan, videoRef, drawBox]);

  const tone = result
    ? result.matched
      ? result.action === "CHECK_IN" || result.action === "CHECK_OUT"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800"
      : "border-rose-200 bg-rose-50 text-rose-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Last scan</p>
        <button type="button" className={btnOutline} onClick={() => doScan(true)} disabled={!modelsReady || busy}>
          {busy ? "Scanning…" : "Scan now"}
        </button>
      </div>
      <div className={`rounded-lg border p-3 ${tone}`}>
        {!result && <p className="text-sm">Waiting for a face…</p>}
        {result && (
          <>
            <p className="font-medium">{result.matched ? fullName(result.staff) : "Face not recognised"}</p>
            <p className="mt-1 text-sm">{result.message}</p>
            {result.matched && (
              <p className="mt-1 text-xs opacity-80">
                {String(result.session || session).toUpperCase()}
                {result.time ? ` · ${result.time}` : ""}
                {result.status ? ` · ${result.status}` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EnrollPanel({ videoRef, modelsReady, onSaved }) {
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [samples, setSamples] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query) => {
    setError("");
    try {
      const rows = await api(`/staff${query ? `?search=${encodeURIComponent(query)}` : ""}`);
      setStaff(rows || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  useEffect(() => {
    setSamples([]);
    setMessage("");
    setError("");
  }, [selected && selected.id]);

  const capture = async () => {
    if (!modelsReady || !videoRef.current) return;
    setError("");
    setMessage("");
    try {
      const res = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!res || !res.descriptor) {
        setError("No face detected. Hold still and try again.");
        return;
      }
      setSamples((prev) => [...prev, Array.from(res.descriptor)]);
    } catch (err) {
      setError(err.message || "Could not capture sample");
    }
  };

  const save = async () => {
    if (!selected || samples.length === 0) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(`/staff/${selected.id}/enroll`, {
        method: "POST",
        body: JSON.stringify({ descriptors: samples }),
      });
      setMessage(`Face saved for ${fullName(selected)}.`);
      setSamples([]);
      await load(search);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || "Could not save face");
    } finally {
      setSaving(false);
    }
  };

  const removeEnrollment = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(`/staff/${selected.id}`, { method: "DELETE" });
      setMessage("Enrolled faces removed.");
      await load(search);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || "Could not remove");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${card} space-y-3`}>
      <p className="font-medium">Register a staff face</p>
      <div className="flex gap-2">
        <input
          className={input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load(search);
          }}
          placeholder="Search staff name…"
        />
        <button type="button" className={btnOutline} onClick={() => load(search)}>
          Search
        </button>
      </div>

      <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
        {staff.map((person) => (
          <button
            type="button"
            key={person.id}
            onClick={() => setSelected(person)}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
              selected && selected.id === person.id ? "bg-muted font-medium" : "hover:bg-muted/50"
            }`}
          >
            <span>
              {fullName(person)}
              <span className="block text-xs capitalize text-muted-foreground">{String(person.role || "").replace(/_/g, " ")}</span>
            </span>
            <span className={`text-xs ${person.enrolled_count > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {person.enrolled_count > 0 ? `${person.enrolled_count} samples` : "not enrolled"}
            </span>
          </button>
        ))}
        {!staff.length && <p className="p-3 text-sm text-muted-foreground">No staff found</p>}
      </div>

      {selected && (
        <div className="space-y-2">
          <p className="text-sm">
            Selected: <span className="font-medium">{fullName(selected)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={capture} disabled={!modelsReady}>
              Capture sample ({samples.length})
            </button>
            <button type="button" className={btnPrimary} onClick={save} disabled={saving || !samples.length}>
              {saving ? "Saving…" : "Save face"}
            </button>
            <button type="button" className={btnDanger} onClick={removeEnrollment} disabled={saving}>
              Clear
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: capture 3–5 samples looking straight, slightly left, and slightly right.
          </p>
        </div>
      )}

      {message && <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}

function ExceptionPanel({ session }) {
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("leave");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query) => {
    setError("");
    try {
      const rows = await api(`/staff${query ? `?search=${encodeURIComponent(query)}` : ""}`);
      setStaff(rows || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const mark = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/exception", {
        method: "POST",
        body: JSON.stringify({ staffId: selected.id, session, status }),
      });
      setMessage(`Marked ${fullName(selected)} as ${status} for the ${session.toUpperCase()} session.`);
    } catch (err) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${card} max-w-2xl space-y-3`}>
      <p className="font-medium">Mark leave / emergency for a session</p>
      <p className="text-xs text-muted-foreground">
        Current session: <span className="font-medium">{session.toUpperCase()}</span>. Change the session toggle at the top.
      </p>
      <div className="flex gap-2">
        <input
          className={input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load(search);
          }}
          placeholder="Search staff name…"
        />
        <button type="button" className={btnOutline} onClick={() => load(search)}>
          Search
        </button>
      </div>
      <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
        {staff.map((person) => (
          <button
            type="button"
            key={person.id}
            onClick={() => setSelected(person)}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
              selected && selected.id === person.id ? "bg-muted font-medium" : "hover:bg-muted/50"
            }`}
          >
            <span>
              {fullName(person)}
              <span className="block text-xs capitalize text-muted-foreground">{String(person.role || "").replace(/_/g, " ")}</span>
            </span>
          </button>
        ))}
        {!staff.length && <p className="p-3 text-sm text-muted-foreground">No staff found</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs">
          <span className="block">Status</span>
          <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="leave">Leave</option>
            <option value="emergency">Emergency</option>
          </select>
        </label>
        <button type="button" className={btnPrimary} onClick={mark} disabled={!selected || saving}>
          {saving ? "Saving…" : "Mark"}
        </button>
      </div>
      {message && <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}

function TodayPanel({ revision }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api("/today"));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, revision]);

  const rows = (data && data.attendance) || [];

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="font-medium">
          Today · {data ? data.date : ""} {data && data.time ? `(${data.time})` : ""}
        </p>
        <button type="button" className={btnOutline} onClick={load}>
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Staff</th>
              <th className="p-2 font-medium">Session</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">In</th>
              <th className="p-2 font-medium">Out</th>
              <th className="p-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-2">{fullName(row)}</td>
                <td className="p-2 uppercase">{row.session}</td>
                <td className="p-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      row.status === "present"
                        ? "bg-emerald-100 text-emerald-700"
                        : row.status === "late"
                        ? "bg-amber-100 text-amber-700"
                        : row.status === "absent"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {row.status}
                  </span>
                  {row.late_minutes > 0 && <span className="text-xs text-muted-foreground"> · {row.late_minutes}m</span>}
                </td>
                <td className="p-2">{row.check_in || "—"}</td>
                <td className="p-2">{row.check_out || "—"}</td>
                <td className="p-2 uppercase">{row.source || "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  No attendance recorded yet today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}

function SettingsPanel() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/settings")
      .then((data) => setForm(data))
      .catch((err) => setError(err.message));
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/settings", {
        method: "PUT",
        body: JSON.stringify({
          match_threshold: Number(form.match_threshold),
          match_margin: Number(form.match_margin),
          liveness_required: !!form.liveness_required,
          am_start: form.am_start,
          pm_start: form.pm_start,
          late_grace_minutes: Number(form.late_grace_minutes),
          timezone: form.timezone,
        }),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className={card}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className={`${card} max-w-2xl space-y-4`}>
      <p className="font-medium">Face attendance settings</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Match threshold</span>
          <input
            className={input}
            type="number"
            step="0.01"
            min="0.1"
            max="1"
            value={form.match_threshold}
            onChange={(e) => set("match_threshold", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Match margin</span>
          <input
            className={input}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={form.match_margin}
            onChange={(e) => set("match_margin", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Morning start</span>
          <input className={input} type="time" value={form.am_start} onChange={(e) => set("am_start", e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Afternoon start</span>
          <input className={input} type="time" value={form.pm_start} onChange={(e) => set("pm_start", e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Late grace (minutes)</span>
          <input
            className={input}
            type="number"
            min="0"
            value={form.late_grace_minutes}
            onChange={(e) => set("late_grace_minutes", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs text-muted-foreground">Timezone</span>
          <input className={input} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!form.liveness_required}
          onChange={(e) => set("liveness_required", e.target.checked)}
        />
        Require liveness
      </label>
      <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
      {message && <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}

const TABS = [
  { id: "scan", label: "Scan" },
  { id: "enroll", label: "Enroll" },
  { id: "today", label: "Today" },
  { id: "exception", label: "Leave / Emergency" },
  { id: "settings", label: "Settings" },
];

export default function FaceAttendancePage() {
  const [tab, setTab] = useState("scan");
  const [session, setSession] = useState("am");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelError, setModelError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [revision, setRevision] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const cameraActive = tab === "scan" || tab === "enroll";

  useEffect(() => {
    let alive = true;
    loadModels()
      .then(() => {
        if (alive) setModelsReady(true);
      })
      .catch((err) => {
        if (alive) setModelError(err.message || "Could not load face models");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    api("/today")
      .then((data) => {
        if (data && data.session) setSession(data.session);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    let stream = null;
    setCameraError("");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setCameraError("Camera unavailable. Allow camera access in the browser and try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraActive]);

  const onScanned = useCallback(() => setRevision((n) => n + 1), []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Face Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Enroll staff faces, then scan to mark attendance. Switch morning/afternoon as needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Session</span>
          <button
            type="button"
            className={session === "am" ? btnPrimary : btnOutline}
            onClick={() => setSession((s) => (s === "am" ? "pm" : "am"))}
          >
            {session === "am" ? "Morning" : "Afternoon"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? btnPrimary : btnOutline}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {cameraActive ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CameraCard
              videoRef={videoRef}
              canvasRef={canvasRef}
              modelsReady={modelsReady}
              modelError={modelError}
              cameraError={cameraError}
            />
          </div>
          <div>
            {tab === "scan" ? (
              <ScanPanel
                videoRef={videoRef}
                canvasRef={canvasRef}
                modelsReady={modelsReady}
                session={session}
                onScanned={onScanned}
              />
            ) : (
              <EnrollPanel videoRef={videoRef} modelsReady={modelsReady} onSaved={onScanned} />
            )}
          </div>
        </div>
      ) : (
        <>
          {tab === "today" && <TodayPanel revision={revision} />}
          {tab === "exception" && <ExceptionPanel session={session} />}
          {tab === "settings" && <SettingsPanel />}
        </>
      )}

      {modelError && cameraActive && (
        <div className="rounded-md border border-rose-100 bg-rose-50 p-2 text-sm text-rose-700">{modelError}</div>
      )}
    </div>
  );
}
