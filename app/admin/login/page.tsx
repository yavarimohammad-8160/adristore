"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Mail, ShieldCheck } from "lucide-react";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/admin")) return "/admin";
  if (next.startsWith("/admin/login")) return "/admin";
  return next;
}

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("admin@adristore.com");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function completeLogin() {
    // Full navigation ensures the session cookie is sent on the next request
    window.location.assign(nextPath);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ورود");

      if (data.requires2fa && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        return;
      }

      completeLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pendingToken, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "کد تأیید اشتباه است");
      completeLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در تأیید");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#1e40af]/40 bg-[#111827]/90 backdrop-blur p-8 shadow-[0_0_40px_rgba(30,64,175,0.2)]">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-black font-display hero-title">پنل مدیریت</h1>
          <p className="text-white/60 text-sm mt-2">adristore Admin</p>
        </div>

        {step === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#22c55e] mb-1.5">ایمیل</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="filter-input h-11 pr-10"
                  required
                  dir="ltr"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#fbbf24] mb-1.5">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="filter-input h-11 pr-10"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-fun btn-primary h-12 font-bold text-base mt-2"
            >
              {loading ? "در حال ورود..." : "ورود به پنل"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5] text-sm text-center">
                {error}
              </div>
            )}

            <div className="text-center text-sm text-white/70 mb-2">
              کد ۶ رقمی Google Authenticator را وارد کنید
            </div>

            <div>
              <label className="block text-xs font-bold text-[#93c5fd] mb-1.5">کد تأیید</label>
              <div className="relative">
                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="filter-input h-11 pr-10 text-center tracking-[0.3em]"
                  required
                  dir="ltr"
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full btn-fun btn-primary h-12 font-bold text-base mt-2"
            >
              {loading ? "در حال تأیید..." : "تأیید و ورود"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setStep("login");
                setPendingToken(null);
                setTotpCode("");
                setError("");
              }}
            >
              بازگشت به ورود
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen hero-bg flex items-center justify-center text-white/60">
          در حال بارگذاری...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}