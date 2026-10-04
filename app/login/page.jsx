"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signUp, resetPassword, isAdminUser } from "@/lib/supabase";
import TruePowerLogo from "@/components/TruePowerLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetSuccess] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset") === "success";
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (resetMode) {
        const { error } = await resetPassword(
          email,
          `${window.location.origin}/reset-password`,
        );
        if (error) throw error;
        setResetSent(true);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data } = await signIn(email, password);
        const userId = data?.user?.id;
        const admin = userId ? await isAdminUser(userId) : false;
        if (admin) {
          router.push("/admin");
        } else {
          router.push("/");
        }
        return;
      }

      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) throw signUpError;
      setIsLogin(true);
      setPassword("");
      alert(
        "Account created! Please check your email if verification is required.",
      );
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <main className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-40 h-40 flex items-center justify-center mx-auto mb-4">
              <TruePowerLogo size={52} />
            </div>
            <h2 className="font-display font-bold text-2xl mb-3">
              Check your email
            </h2>
            <p className="text-sub text-sm mb-6">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <button
              onClick={() => {
                setResetSent(false);
                setResetMode(false);
              }}
              className="btn-primary w-full py-3"
            >
              Back to login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4">
            <TruePowerLogo size={80} />
          </div>
          <h1 className="font-display font-bold text-3xl text-ink">
            TruePower
          </h1>
          <p className="text-sub text-sm mt-1">
            {resetMode
              ? "Reset your password"
              : isLogin
                ? "Sign in to your account"
                : "Create a new customer account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
          {resetSuccess && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password updated. Sign in with your new password below.
            </p>
          )}

          {!resetMode && !isLogin && (
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="John Mwangi"
                required
              />
            </div>
          )}

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="hello@truepower.co.ke"
              required
            />
          </div>

          {!resetMode && (
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-ink"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : resetMode
                ? "Send reset link"
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
          </button>

          {!resetMode && (
            <div className="flex items-center justify-between text-sm text-sub">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="hover:text-brand-500 transition-colors"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setResetMode(false);
                  setError("");
                  setPassword("");
                }}
                className="text-brand-500 font-semibold hover:underline"
              >
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </div>
          )}

          {resetMode && (
            <div className="flex items-center justify-center text-sm text-sub">
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError("");
                }}
                className="hover:text-brand-500 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}