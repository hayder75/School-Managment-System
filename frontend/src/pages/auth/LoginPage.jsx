import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import {
  Eye, EyeOff, School, GraduationCap, ShieldCheck, BookOpen, MapPin,
  Sparkles, UserRound, Lock, ArrowRight, ChevronLeft, ChevronRight,
} from "lucide-react";
import api from "../../lib/api";
import studentIllustration from "../../assets/student_illustration.png";

const ROLE_LABELS = {
  owner: "School Owner",
  admin: "Administrator",
  teacher: "Teacher",
  finance: "Finance Officer",
  cashier: "Cashier",
  hr: "HR Officer",
  support: "Support Staff",
  parent: "Parent",
  student: "Student",
};

const ROLE_COLORS = {
  owner: "from-amber-400 to-orange-600",
  admin: "from-teal-500 to-[#2c5a5e]",
  teacher: "from-blue-500 to-indigo-600",
  finance: "from-emerald-500 to-teal-600",
  cashier: "from-sky-500 to-cyan-600",
  hr: "from-violet-500 to-purple-600",
  support: "from-slate-500 to-slate-700",
  parent: "from-pink-500 to-rose-600",
  student: "from-lime-500 to-green-600",
};

const ROLE_DOT = {
  owner: "bg-amber-500",
  admin: "bg-teal-600",
  teacher: "bg-blue-500",
  finance: "bg-emerald-500",
  cashier: "bg-sky-500",
  hr: "bg-violet-500",
  support: "bg-slate-500",
  parent: "bg-pink-500",
  student: "bg-lime-500",
};

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function Avatar({ user, size = "md" }) {
  const dims = size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  const ring = size === "lg" ? "ring-4 ring-white/20" : "ring-2 ring-white/40";
  return (
    <div
      className={`${dims} ${ring} rounded-full bg-gradient-to-br ${ROLE_COLORS[user.role] || "from-slate-500 to-slate-700"} flex items-center justify-center text-white font-bold shadow-lg shrink-0`}
    >
      {initials(`${user.first_name} ${user.last_name}`)}
    </div>
  );
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUsers, setDevUsers] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState("");
  const [activeRole, setActiveRole] = useState("");

  const { login, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const stripRef = useRef(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    api.get("/auth/dev-users")
      .then((res) => setDevUsers(res?.data?.users || []))
      .catch(() => {});
  }, []);

  async function handleDevSelect(user) {
    if (!user) return;
    setSelectedDevId(user.id);
    setActiveRole(user.role);
    setIdentifier(user.email);
    setPassword("1234");
    setError("");
    setLoading(true);
    try {
      await login(user.email, "1234");
      navigate("/dashboard");
    } catch (err) {
      setError(err?.error?.message || err?.message || "Login failed");
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.error?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // keep a few curated accounts per role for a tidy avatar strip
  const grouped = devUsers.reduce((acc, u) => {
    (acc[u.role] = acc[u.role] || []).push(u);
    return acc;
  }, {});
  const curated = Object.keys(grouped)
    .sort()
    .flatMap((role) => grouped[role].slice(0, 2));

  const scroll = (dir) => stripRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  if (isLoading) return null;

  const selectedDev = devUsers.find((u) => u.id === selectedDevId);

  return (
    <div className="min-h-screen w-full bg-[#0b1220] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-[#538a8d] selection:text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0f1f2e] to-[#0a1830]" />
      <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-[#538a8d]/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[460px] h-[460px] rounded-full bg-[#e0702b]/15 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Card */}
      <div className="relative w-full max-w-[1120px] bg-white rounded-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">

        {/* ── Left: Branding ── */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-[#2c5a5e] via-[#3f7276] to-[#538a8d] text-white flex flex-col justify-between p-8 sm:p-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute top-12 -left-12 w-44 h-44 rounded-full bg-white/5" />

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 shadow-inner">
              <School size={22} />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight leading-tight">Mount Olive School</p>
              <p className="text-[11px] text-white/60 font-medium flex items-center gap-1">
                <MapPin size={11} /> Hawassa, Ethiopia
              </p>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-white/10 blur-xl" />
              <img
                src={studentIllustration}
                alt="School students illustration"
                className="relative w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-[28px] border border-white/20 shadow-2xl transform hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-2xl bg-[#e0702b] shadow-2xl flex items-center justify-center ring-4 ring-white/10">
                <GraduationCap size={34} className="text-white" />
              </div>
            </div>
          </div>

          {/* Tagline + stats */}
          <div className="relative space-y-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Nurturing Minds,<br />Building Futures
              </h1>
              <p className="text-[12px] text-white/70 font-medium leading-relaxed max-w-sm">
                One portal for students, parents, teachers and staff — attendance, grades, fees and payroll in one place.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["2,887", "Students"],
                ["253", "Staff"],
                ["58", "Classes"],
              ].map(([n, label]) => (
                <div key={label} className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur">
                  <p className="text-lg font-extrabold">{n}</p>
                  <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto flex flex-col justify-center px-6 sm:px-10 py-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-zinc-900 tracking-tight">
              Welcome back 👋
            </h2>
            <p className="text-zinc-400 text-[13px] font-medium mt-1">
              Sign in with your email, phone, or username
            </p>
          </div>

          {/* Demo accounts */}
          {curated.length > 0 && (
            <div className="mb-6 rounded-3xl border border-[#538a8d]/20 bg-gradient-to-br from-[#538a8d]/5 to-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#e0702b]" />
                  <span className="text-xs font-bold text-[#2c5a5e] uppercase tracking-wide">Try a demo account</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">password · 1234</span>
              </div>

              <div className="relative">
                {curated.length > 4 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scroll(-1)}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:border-[#538a8d] transition"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scroll(1)}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:border-[#538a8d] transition"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
                <div ref={stripRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scroll-smooth">
                  {curated.map((u) => {
                    const active = selectedDevId === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleDevSelect(u)}
                        disabled={loading}
                        title={`${u.first_name} ${u.last_name} · ${ROLE_LABELS[u.role] || u.role}`}
                        className={`group flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                          active
                            ? "bg-white shadow-md ring-2 ring-[#538a8d] scale-[1.02]"
                            : "bg-white/60 hover:bg-white hover:shadow-sm ring-1 ring-gray-200 hover:ring-[#538a8d]/40"
                        }`}
                      >
                        <div className="relative">
                          <Avatar user={u} size="lg" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${ROLE_DOT[u.role] || "bg-slate-500"} ring-2 ring-white`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-700 leading-tight">{u.first_name}</span>
                        <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wide">
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDev && (
                <p className="text-[11px] text-zinc-500 mt-2 font-medium flex items-center gap-1">
                  <UserRound size={12} className="text-[#538a8d]" />
                  Signed in as <span className="font-bold text-[#538a8d]">{selectedDev.first_name} {selectedDev.last_name}</span>
                  {activeRole ? ` · ${ROLE_LABELS[activeRole] || activeRole}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">Email, phone, or username *</label>
              <div className="relative">
                <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="Enter your email, phone, or username"
                  className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl pl-10 pr-4 py-3 text-[13px] focus:outline-none focus:border-[#538a8d] focus:bg-white focus:ring-4 focus:ring-[#538a8d]/10 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl pl-10 px-4 pr-11 py-3 text-[13px] focus:outline-none focus:border-[#538a8d] focus:bg-white focus:ring-4 focus:ring-[#538a8d]/10 transition-all placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-[12px] text-zinc-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-[#538a8d] focus:ring-0 cursor-pointer"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => alert("Please contact your administrator to reset password.")}
                className="text-[12px] font-semibold text-[#538a8d] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#457678] to-[#2c5a5e] hover:from-[#538a8d] hover:to-[#3f7276] text-white font-semibold text-[13px] shadow-lg shadow-[#2c5a5e]/30 transition-all duration-200 hover:shadow-xl hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in as {selectedDev?.first_name && "demo"}...
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Trust footer */}
          <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-[#538a8d]" /> Secure login</span>
            <span className="flex items-center gap-1"><BookOpen size={13} className="text-[#538a8d]" /> EMIS aligned</span>
            <span className="flex items-center gap-1"><MapPin size={13} className="text-[#538a8d]" /> Hawassa</span>
          </div>

          <p className="text-[12px] text-zinc-400 text-center mt-4 font-medium">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => alert("Please contact your school administrator for registration.")}
              className="text-[#538a8d] font-semibold hover:underline cursor-pointer"
            >
              Contact admin
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}