import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import api from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUsers, setDevUsers] = useState([]);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/dev-users").then((res) => {
      setDevUsers(res?.data?.users || []);
    }).catch(() => {});
  }, []);

  async function handleDevSelect(userId) {
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
      setError(err?.error?.message || "Login failed");
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
      setError(err?.error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 items-center justify-center p-16 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, white 0%, transparent 50%), radial-gradient(circle at 75% 80%, white 0%, transparent 50%), radial-gradient(circle at 50% 20%, white 0%, transparent 50%)"
        }} />
        <div className="relative z-10 text-center max-w-lg">
          <svg viewBox="0 0 640 520" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
            <defs>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366F1"/>
                <stop offset="100%" stopColor="#4F46E5"/>
              </linearGradient>
              <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24"/>
                <stop offset="100%" stopColor="#F59E0B"/>
              </linearGradient>
            </defs>
            <rect x="160" y="280" width="320" height="180" rx="16" fill="white" opacity="0.95"/>
            <rect x="160" y="280" width="320" height="180" rx="16" stroke="#E0E7FF" strokeWidth="2"/>
            <rect x="130" y="250" width="380" height="40" rx="10" fill="white" opacity="0.95"/>
            <rect x="130" y="250" width="380" height="40" rx="10" stroke="#C7D2FE" strokeWidth="2"/>
            <rect x="130" y="250" width="120" height="40" rx="10" fill="url(#bgGrad)"/>
            <rect x="260" y="260" width="40" height="20" rx="4" fill="white" opacity="0.3"/>
            <rect x="310" y="260" width="40" height="20" rx="4" fill="white" opacity="0.3"/>
            <rect x="360" y="260" width="40" height="20" rx="4" fill="white" opacity="0.3"/>
            <rect x="420" y="260" width="40" height="20" rx="4" fill="white" opacity="0.3"/>
            <rect x="470" y="260" width="30" height="20" rx="4" fill="white" opacity="0.3"/>

            <rect x="185" y="310" width="90" height="130" rx="8" fill="#FEF3C7"/>
            <rect x="185" y="310" width="90" height="130" rx="8" stroke="#F59E0B" strokeWidth="1.5"/>
            <rect x="185" y="310" width="90" height="24" rx="8" fill="#FCD34D"/>
            <rect x="210" y="350" width="40" height="8" rx="4" fill="#FDE68A"/>
            <rect x="210" y="370" width="40" height="8" rx="4" fill="#FDE68A"/>
            <rect x="210" y="390" width="40" height="8" rx="4" fill="#FDE68A"/>
            <rect x="210" y="410" width="40" height="8" rx="4" fill="#FDE68A"/>

            <rect x="295" y="310" width="130" height="140" rx="8" fill="#D1FAE5"/>
            <rect x="295" y="310" width="130" height="140" rx="8" stroke="#10B981" strokeWidth="1.5"/>
            <rect x="295" y="310" width="130" height="24" rx="8" fill="#6EE7B7"/>
            <rect x="310" y="350" width="24" height="24" rx="4" fill="white"/>
            <rect x="345" y="350" width="24" height="24" rx="4" fill="white"/>
            <rect x="380" y="350" width="24" height="24" rx="4" fill="white"/>
            <rect x="310" y="385" width="24" height="24" rx="4" fill="white"/>
            <rect x="345" y="385" width="24" height="24" rx="4" fill="white"/>
            <rect x="380" y="385" width="24" height="24" rx="4" fill="white"/>
            <rect x="310" y="420" width="24" height="24" rx="4" fill="white"/>
            <rect x="345" y="420" width="24" height="24" rx="4" fill="white"/>
            <rect x="380" y="420" width="24" height="24" rx="4" fill="white"/>

            <rect x="445" y="310" width="90" height="130" rx="8" fill="#FEE2E2"/>
            <rect x="445" y="310" width="90" height="130" rx="8" stroke="#EF4444" strokeWidth="1.5"/>
            <rect x="445" y="310" width="90" height="24" rx="8" fill="#FCA5A5"/>
            <rect x="465" y="350" width="50" height="8" rx="4" fill="#FECACA"/>
            <rect x="465" y="370" width="50" height="8" rx="4" fill="#FECACA"/>
            <rect x="465" y="390" width="50" height="8" rx="4" fill="#FECACA"/>

            <path d="M100 250 L320 120 L540 250" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            <path d="M80 270 L320 140 L560 270" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" strokeDasharray="8 6"/>

            <rect x="290" y="140" width="60" height="60" rx="16" fill="white" opacity="0.9"/>
            <rect x="290" y="140" width="60" height="60" rx="16" stroke="#E0E7FF" strokeWidth="2"/>
            <path d="M310 180 V155 M300 167 L310 155 L320 167" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M305 185 L335 185" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <path d="M305 192 L325 192" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>

            <rect x="420" y="130" width="90" height="50" rx="10" fill="white" opacity="0.9"/>
            <rect x="420" y="130" width="90" height="50" rx="10" stroke="#E0E7FF" strokeWidth="2"/>
            <circle cx="445" cy="155" r="14" fill="#D1FAE5" stroke="#10B981" strokeWidth="2"/>
            <path d="M441 155 L444 158 L449 152" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="475" y="160" fontSize="11" fontWeight="600" fill="#374151" fontFamily="system-ui">98%</text>

            <rect x="70" y="140" width="100" height="70" rx="10" fill="white" opacity="0.9"/>
            <rect x="70" y="140" width="100" height="70" rx="10" stroke="#E0E7FF" strokeWidth="2"/>
            <circle cx="100" cy="160" r="8" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
            <text x="100" y="163" textAnchor="middle" fontSize="9" fill="#92400E">&#9733;</text>
            <text x="115" y="164" fontSize="11" fontWeight="600" fill="#374151" fontFamily="system-ui">4.8</text>
            <text x="90" y="190" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">1.2k reviews</text>

            <rect x="260" y="470" width="120" height="6" rx="3" fill="white" opacity="0.2"/>
            <rect x="260" y="470" width="80" height="6" rx="3" fill="white" opacity="0.4"/>
          </svg>
          <h2 className="text-3xl font-bold text-white mt-10 tracking-tight">
            Manage your school ecosystem
          </h2>
          <p className="text-indigo-200 mt-3 text-lg leading-relaxed">
            From enrollment to exams, fees to report cards — everything in one platform.
          </p>
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">10+</p>
              <p className="text-indigo-300 text-sm mt-1">Schools</p>
            </div>
            <div className="w-px h-10 bg-indigo-500" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">1K+</p>
              <p className="text-indigo-300 text-sm mt-1">Students</p>
            </div>
            <div className="w-px h-10 bg-indigo-500" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">50+</p>
              <p className="text-indigo-300 text-sm mt-1">Teachers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Yemokera SMS</h1>
                <p className="text-sm text-gray-500">School Management System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          {devUsers.length > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Label className="text-xs font-semibold text-indigo-700 mb-2 block">Quick Login (Dev)</Label>
              <Select onValueChange={handleDevSelect}>
                <SelectTrigger className="bg-white border-indigo-200"><SelectValue placeholder="Select a user..." /></SelectTrigger>
                <SelectContent>
                  {devUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium shadow-lg shadow-indigo-200 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            &copy; {new Date().getFullYear()} Yemokera SMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
