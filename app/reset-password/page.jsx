"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import TruePowerLogo from "@/components/TruePowerLogo";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const bootRecovery = async () => {
      if (!hasSupabaseConfig()) {
        if (active) {
          setError("Supabase is not configured.");
          setLoading(false);
        }
        return;
      }

      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hasRecoveryLink =
          searchParams.has("code") ||
          searchParams.has("access_token") ||
          searchParams.get("type") === "recovery";

        if (hasRecoveryLink) {
          const code = searchParams.get("code");

          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          } else {
            const { data, error: urlError } =
              await supabase.auth.getSessionFromUrl({ storeSession: true });
            if (urlError) throw urlError;
            if (!data?.session) {
              throw new Error("Unable to restore reset session from the URL.");
            }
          }

          window.history.replaceState({}, document.title, "/reset-password");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;
        setReady(Boolean(session));

        if (!session) {
          setError(
            hasRecoveryLink
              ? "This reset link is invalid or expired. Request a new one and try again."
              : "Open the password reset link from your email first.",
          );
        }
      } catch (err) {
        if (!active) return;
        setError(err?.message || "This reset link is invalid or expired.");
      } finally {
        if (active) setLoading(false);
      }
    };

    bootRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED"
      ) {
        setReady(Boolean(session));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      router.replace("/login?reset=success");
    } catch (err) {
      setError(err?.message || "Unable to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto mb-4">
            <TruePowerLogo size={80} />
          </div>
          <h1 className="font-display font-bold text-3xl text-ink">
            Reset Password
          </h1>
          <p className="text-sub text-sm mt-1">
            {loading
              ? "Checking your reset link..."
              : ready
                ? "Choose a new password for your account"
                : "Use the reset link from your email"}
          </p>
        </div>

        <div className="card p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-sub">Preparing secure reset session...</p>
            </div>
          ) : !ready ? (
            <div className="text-center">
              <p className="text-sm text-sub mb-6">
                {error || "This page only works after you click the password reset link in your email."}
              </p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="btn-primary w-full py-3"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Enter a new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Repeat your new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-ink"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl border border-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center py-3 disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
