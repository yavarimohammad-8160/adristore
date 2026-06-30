"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { AdminHeader, RefreshBasalamButton } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateStrongPassword } from "@/lib/password-policy";

interface BasalamStatus {
  connected: boolean;
  total: number;
  lastRefreshed?: string;
  totalValue: number;
}

export function SettingsPage() {
  const [status, setStatus] = useState<BasalamStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/basalam", { credentials: "include" });
      if (!res.ok) throw new Error();
      setStatus(await res.json());
    } catch {
      toast.error("خطا در بارگذاری تنظیمات");
    } finally {
      setLoading(false);
    }
  }

  async function loadTotp() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/admin/settings/totp", { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTotpEnabled(Boolean(data.enabled));
    } catch {
      toast.error("خطا در بارگذاری 2FA");
    } finally {
      setTotpLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadTotp();
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("رمز جدید و تکرار آن یکسان نیستند");
      return;
    }
    const policy = validateStrongPassword(newPassword);
    if (!policy.ok) {
      toast.error(policy.errors[0]);
      return;
    }
    setChanging(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      toast.success("رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setChanging(false);
    }
  }

  async function startTotpSetup() {
    setTotpBusy(true);
    try {
      const res = await fetch("/api/admin/settings/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      setSetupSecret(data.secret);
      setSetupQrDataUrl(data.qrDataUrl ?? null);
      setSetupCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpBusy(false);
    }
  }

  async function enableTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!setupSecret) return;
    setTotpBusy(true);
    try {
      const res = await fetch("/api/admin/settings/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "enable", secret: setupSecret, code: setupCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      toast.success("احراز هویت دو مرحله‌ای فعال شد");
      setSetupSecret(null);
      setSetupQrDataUrl(null);
      setSetupCode("");
      setTotpEnabled(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpBusy(false);
    }
  }

  async function disableTotp(e: React.FormEvent) {
    e.preventDefault();
    setTotpBusy(true);
    try {
      const res = await fetch("/api/admin/settings/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "disable", code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      toast.success("2FA غیرفعال شد");
      setDisableCode("");
      setTotpEnabled(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpBusy(false);
    }
  }

  function copySecret() {
    if (!setupSecret) return;
    navigator.clipboard.writeText(setupSecret);
    toast.success("Secret کپی شد");
  }

  return (
    <div className="max-w-2xl">
      <AdminHeader title="تنظیمات" subtitle="اتصال باسلام، امنیت و 2FA" />

      <section className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/60 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-[#22c55e]" />
          اتصال باسلام
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> در حال بررسی...
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status.connected ? (
                <CheckCircle2 className="h-6 w-6 text-[#22c55e]" />
              ) : (
                <XCircle className="h-6 w-6 text-[#ef4444]" />
              )}
              <div>
                <p className="font-bold">
                  {status.connected ? "متصل به باسلام" : "اتصال برقرار نیست"}
                </p>
                <p className="text-sm text-white/50">
                  وضعیت API از طریق اتصال زنده بررسی می‌شود
                </p>
              </div>
            </div>

            <RefreshBasalamButton onSuccess={loadStatus} />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border-2 border-[#3b82f6]/30 bg-[#111827]/60 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#93c5fd]" />
          احراز هویت دو مرحله‌ای (2FA)
        </h2>

        {totpLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white/50" />
        ) : totpEnabled ? (
          <form onSubmit={disableTotp} className="space-y-3">
            <p className="text-sm text-[#22c55e] font-bold">✓ 2FA فعال است</p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              placeholder="کد ۶ رقمی برای غیرفعال‌سازی"
              className="filter-input h-11 max-w-xs"
              dir="ltr"
            />
            <Button type="submit" disabled={totpBusy} variant="outline" className="text-[#ef4444]">
              غیرفعال کردن 2FA
            </Button>
          </form>
        ) : setupSecret ? (
          <form onSubmit={enableTotp} className="space-y-4">
            <p className="text-sm text-white/70">
              QR را در Google Authenticator اسکن کنید یا Secret را دستی وارد کنید:
            </p>
            {setupQrDataUrl ? (
              <img
                src={setupQrDataUrl}
                alt="QR Code 2FA"
                width={180}
                height={180}
                className="rounded-xl border border-white/10 bg-white p-2"
              />
            ) : null}
            <div className="flex items-center gap-2">
              <code className="text-xs bg-black/40 px-2 py-1 rounded break-all" dir="ltr">
                {setupSecret}
              </code>
              <Button type="button" size="sm" variant="ghost" onClick={copySecret}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
              placeholder="کد ۶ رقمی از اپ"
              className="filter-input h-11 max-w-xs"
              dir="ltr"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={totpBusy} className="btn-primary font-bold">
                فعال‌سازی 2FA
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    await fetch("/api/admin/settings/totp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ action: "cancel" }),
                    });
                  } catch {
                    // ignore
                  }
                  setSetupSecret(null);
                  setSetupQrDataUrl(null);
                  setSetupCode("");
                }}
              >
                انصراف
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={startTotpSetup} disabled={totpBusy} className="btn-blue font-bold">
            راه‌اندازی Google Authenticator
          </Button>
        )}
      </section>

      <section className="rounded-2xl border-2 border-[#ef4444]/30 bg-[#111827]/60 p-6">
        <h2 className="text-lg font-bold mb-4">تغییر رمز عبور ادمین</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <Label className="text-white/70 font-bold mb-1.5">رمز فعلی</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="filter-input h-11"
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label className="text-white/70 font-bold mb-1.5">رمز جدید</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={16}
              className="filter-input h-11"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="text-white/70 font-bold mb-1.5">تکرار رمز جدید</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="filter-input h-11"
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={changing}
            className="btn-fun btn-primary font-bold"
          >
            {changing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            ذخیره رمز جدید
          </Button>
        </form>
        <ul className="text-xs text-white/45 mt-4 space-y-1 list-disc list-inside">
          <li>حداقل ۱۶ کاراکتر</li>
          <li>حروف بزرگ و کوچک انگلیسی</li>
          <li>حداقل یک عدد و یک کاراکتر ویژه</li>
        </ul>
      </section>
    </div>
  );
}