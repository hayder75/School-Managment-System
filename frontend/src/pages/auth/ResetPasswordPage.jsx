import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Lock, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token");

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) { setError(err?.error?.message || "Reset failed"); } finally { setLoading(false); }
  }

  if (!token) return <div className="min-h-screen flex items-center justify-center"><p>Invalid reset link</p></div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password</p>
        </div>
        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm">Password reset successfully!</p>
            <Link to="/auth/login" className="text-sm text-primary hover:underline" onClick={() => navigate("/auth/login")}>Sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2"><Label>New Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
            <div className="space-y-2"><Label>Confirm Password</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
            <Button type="submit" disabled={loading} className="w-full"><Lock className="h-4 w-4 mr-2" />{loading ? "Resetting..." : "Reset Password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
