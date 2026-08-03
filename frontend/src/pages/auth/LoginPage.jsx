import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Eye, EyeOff, UserCheck, School, GraduationCap, ShieldCheck, BookOpen, MapPin, ChevronDown } from "lucide-react";
import api from "../../lib/api";
import studentIllustration from "../../assets/student_illustration.png";

const ROLE_LABELS = {
  owner: "School Owner",
  admin: "Administrator",
  teacher: "Teacher",
  finance: "Finance",
  cashier: "Cashier",
  hr: "HR Officer",
  support: "Support Staff",
  parent: "Parent",
  student: "Student",
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUsers, setDevUsers] = useState([]);
  const [selectedDevId, setSelectedDevId] = useState("");

  const { login, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

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

  async function handleDevSelect(userId) {
    setSelectedDevId(userId);
    const user = devUsers.find((u) => u.id === userId);
    if (!user) return;
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

  if (isLoading) return null;

  const selectedDev = devUsers.find((u) => u.id === selectedDevId);

  return (
    <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-[#538a8d] selection:text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#12283a] to-[#0f1f2e]" />
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[#538a8d]/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-[#e0702b]/10 blur-3xl" />

      {/* Main Card */}
      <div className="relative w-full max-w-[1100px] bg-white rounded-[32px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: School Branding Panel */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-[#538a8d] via-[#3f7276] to-[#2c5a5e] text-white flex flex-col justify-between p-8 sm:p-10 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute top-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

          {/* Logo row */}
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <School size={22} />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight leading-tight">Mount Olive School</p>
              <p className="text-[11px] text-white/60 font-medium">Hawassa, Ethiopia</p>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-white/10 blur-xl" />
              <img
                src={studentIllustration}
                alt="School students illustration"
                className="relative w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-[28px] border border-white/20 shadow-2xl transform hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute -bottom-3 -right-3 w-20 h-20 rounded-2xl bg-[#e0702b] shadow-xl flex items-center justify-center">
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
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur">
                <p className="text-lg font-extrabold">2,887</p>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide">Students</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur">
                <p className="text-lg font-extrabold">253</p>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide">Staff</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur">
                <p className="text-lg font-extrabold">58</p>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide">Classes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto flex flex-col justify-center px-6 sm:px-10 py-10">
          
          {/* Quick Login Dropdown */}
          {devUsers.length > 0 && (
            <div className="mb-6 rounded-2xl border border-[#538a8d]/25 bg-[#538a8d]/5 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck size={15} className="text-[#538a8d]" />
                <span className="text-xs font-bold text-[#3f6b6e] uppercase tracking-wide">Quick Login</span>
              </div>
              <div className="relative">
                <select
                  value={selectedDevId}
                  onChange={(e) => handleDevSelect(e.target.value)}
                  className="w-full appearance-none bg-white text-zinc-800 text-sm rounded-xl px-3.5 py-2.5 pr-9 border border-gray-200 focus:outline-none focus:border-[#538a8d] focus:ring-2 focus:ring-[#538a8d]/20 cursor-pointer"
                >
                  <option value="">Pick a demo account…</option>
                  {devUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} — {ROLE_LABELS[u.role] || u.role}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
              {selectedDev && (
                <p className="text-[11px] text-zinc-500 mt-2 font-medium">
                  Fills the form for you — password is <span className="font-bold text-[#538a8d]">1234</span>
                </p>
              )}
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-zinc-900 tracking-tight">
              Welcome back 👋
            </h2>
            <p className="text-zinc-400 text-[13px] font-medium mt-1">
              Sign in with your email, phone, or username
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Email, phone, or username *
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="Enter your email, phone, or username"
                className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-[#538a8d] focus:bg-white transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 block">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl px-4 py-3 pr-11 text-[13px] focus:outline-none focus:border-[#538a8d] focus:bg-white transition-all placeholder:text-zinc-400"
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

            {/* Remember Me & Forgot Password Row */}
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
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your administrator to reset password.");
                }}
                className="text-[12px] font-semibold text-[#538a8d] hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-2xl bg-[#538a8d] hover:bg-[#457678] text-white font-semibold text-[13px] shadow-lg shadow-[#538a8d]/25 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Trust footer */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-zinc-400 font-medium">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-[#538a8d]" /> Secure login</span>
            <span className="flex items-center gap-1"><BookOpen size={13} className="text-[#538a8d]" /> EMIS aligned</span>
            <span className="flex items-center gap-1"><MapPin size={13} className="text-[#538a8d]" /> Hawassa</span>
          </div>

          {/* Footer Text */}
          <p className="text-[12px] text-zinc-400 text-center mt-5 font-medium">
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
