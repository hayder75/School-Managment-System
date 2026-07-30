import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Eye, EyeOff, UserCheck } from "lucide-react";
import api from "../../lib/api";
import student3dBoy from "../../assets/student_3d_boy.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
    setEmail(user.email);
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
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.error?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="min-h-screen w-full bg-[#f3f4f8] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-teal-500 selection:text-white">
      {/* Main White Rounded Card Container */}
      <div className="w-full max-w-[1000px] bg-white rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] p-6 sm:p-10 md:p-12 border border-gray-100/80 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center relative overflow-hidden">
        
        {/* Left Side: 3D Illustration Panel with Pink Backdrop */}
        <div className="lg:col-span-6 flex items-center justify-center relative p-4">
          <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full bg-gradient-to-tr from-[#fae5e5] via-[#fdeeed] to-[#fef6f5] flex items-center justify-center shadow-inner overflow-hidden p-2 border border-pink-100/50">
            <img
              src={student3dBoy}
              alt="3D Student Illustration"
              className="w-full h-full object-cover rounded-full drop-shadow-md transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto px-2 sm:px-4">
          
          {/* Dev Quick Login Pill */}
          {devUsers.length > 0 && (
            <div className="mb-5 flex items-center justify-between bg-gray-50 border border-gray-200/80 rounded-2xl p-2 px-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#538a8d]">
                <UserCheck size={15} />
                <span>Quick Dev Login</span>
              </div>
              <select
                value={selectedDevId}
                onChange={(e) => handleDevSelect(e.target.value)}
                className="bg-white text-zinc-700 text-xs rounded-xl px-2.5 py-1 border border-gray-200 focus:outline-none focus:border-[#538a8d] cursor-pointer"
              >
                <option value="">Select test user...</option>
                {devUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Sign in to <span className="text-[#e0702b]">School Portal</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium mt-1">
              Continue your learning experience today!
            </p>
          </div>

          {/* Google Sign In Option */}
          <button
            type="button"
            onClick={() => alert("Google SSO Integration requires OAuth setup.")}
            className="w-full py-2.5 px-4 rounded-full border border-gray-200/90 bg-white hover:bg-gray-50/80 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer hover:border-gray-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.15C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.25 5.39l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="flex items-center my-5 text-[11px] text-zinc-400 font-medium gap-3">
            <div className="h-px bg-gray-200/80 flex-1" />
            <span>or use email</span>
            <div className="h-px bg-gray-200/80 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 block">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#538a8d] focus:bg-white transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
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
                  className="w-full bg-[#f9fafb] border border-gray-200 text-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-xs focus:outline-none focus:border-[#538a8d] focus:bg-white transition-all placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium cursor-pointer">
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
                className="text-[11px] font-semibold text-[#538a8d] hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-6 rounded-2xl bg-[#538a8d] hover:bg-[#457678] text-white font-semibold text-xs shadow-md shadow-[#538a8d]/20 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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

          {/* Footer Text */}
          <p className="text-[11px] text-zinc-400 text-center mt-5 font-medium">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => alert("Please contact your school administrator for registration.")}
              className="text-[#538a8d] font-semibold hover:underline cursor-pointer"
            >
              Sign up
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
