import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useI18n } from "../../i18n/I18nContext";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, Languages, BookOpen,
} from "lucide-react";
import { warmRole } from "../../lib/prefetch";

function homeFor(role) {
  return role === "face_attendance" ? "/face-attendance" : "/dashboard";
}

export default function LoginPage() {
  const { t, lang, switchLang } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(homeFor(useAuthStore.getState().user?.role), { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      warmRole(useAuthStore.getState().user?.role);
      navigate(homeFor(useAuthStore.getState().user?.role));
    } catch (err) {
      setError(err?.error?.message || err?.message || t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen w-full bg-neutral-50 text-neutral-900 font-sans flex flex-col items-center justify-center p-4 sm:p-6">
      {/* faint background mark */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <img
          src="/logo.svg"
          alt=""
          aria-hidden="true"
          className="h-[70vh] max-h-[720px] w-auto opacity-[0.07] select-none"
        />
      </div>

      {/* Language switch — changes the whole system language */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-30">
        <div className="flex items-center rounded-full border border-neutral-200 bg-white shadow-sm p-0.5">
          <Languages size={13} className="text-neutral-400 ml-1.5 mr-0.5 hidden sm:block" />
          {["en", "am"].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => switchLang(l)}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-semibold transition-colors cursor-pointer ${
                lang === l
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {l === "en" ? t.auth.english : t.auth.amharic}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-[440px] pt-10 sm:pt-0">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.svg"
            alt="Mount Olive School"
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm object-contain"
          />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Mount Olive School</h1>
          <p className="text-[12px] text-neutral-400 font-medium mt-0.5">
            {lang === "am" ? "የትምህርት ቤት አስተዳደር ሥርዓት" : "School Management System"}
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-sm">
          <h2 className="text-[17px] font-semibold tracking-tight">{t.auth.welcomeBack}</h2>
          <p className="text-[12px] text-neutral-400 font-medium mt-0.5 mb-5">
            {t.auth.signInWith}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-2.5 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-600 block">{t.auth.emailOrUsername}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="you@school.edu"
                  className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2.5 text-[13px] focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all placeholder:text-neutral-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-600 block">{t.auth.password}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-10 py-2.5 text-[13px] focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-all placeholder:text-neutral-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20 cursor-pointer"
                />
                {t.auth.rememberMe}
              </label>
              <button
                type="button"
                onClick={() => alert(t.auth.contactAdminReset)}
                className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                {t.auth.forgotPassword}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t.auth.signingIn}
                </span>
              ) : (
                <>
                  {t.auth.signIn}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-neutral-400 text-center mt-5 font-medium">
          {t.auth.noAccount}{" "}
          <button
            type="button"
            onClick={() => alert(t.auth.contactAdminRegister)}
            className="text-neutral-700 font-semibold hover:text-neutral-900 hover:underline cursor-pointer"
          >
            {t.auth.contactAdmin}
          </button>
        </p>

        <a
          href="/help"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 flex items-center gap-3.5 rounded-2xl border border-neutral-300 bg-white px-4 py-3.5 text-left shadow-sm transition-all hover:border-neutral-900 hover:shadow-md"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition-colors group-hover:bg-neutral-700">
            <BookOpen size={18} strokeWidth={1.9} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold leading-tight text-neutral-900">
              Read the user manual
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-neutral-500">
              What each role can do, step by step
            </span>
          </span>
          <ArrowRight
            size={16}
            className="ml-auto flex-shrink-0 text-neutral-400 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-900"
          />
        </a>
      </div>
    </div>
  );
}