"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SecurityStatus {
  password: {
    minLength: number;
    storedSecurely: boolean;
    updatedAt: string | null;
    strength: string;
  };
  twoFactor: { enabled: boolean };
  lockout: { maxAttempts: number; lockoutMinutes: number; activeLockouts: number };
  ipRestriction: { enabled: boolean; allowedCount: number };
  sessionHours: number;
}

function StatusRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      {ok ? (
        <ShieldCheck className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
      ) : (
        <ShieldAlert className="h-5 w-5 text-[#fbbf24] shrink-0 mt-0.5" />
      )}
      <div>
        <p className="font-bold text-sm">{label}</p>
        <p className="text-xs text-white/50 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export function SecurityStatusCard() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/security/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-[#3b82f6]/30 bg-[#111827]/60 p-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#93c5fd]" />
      </div>
    );
  }

  if (!status) return null;

  const score = [
    status.password.strength === "strong",
    status.twoFactor.enabled,
    status.lockout.maxAttempts <= 5,
    true,
  ].filter(Boolean).length;

  return (
    <div className="rounded-2xl border-2 border-[#3b82f6]/30 bg-[#111827]/60 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#93c5fd]" />
          وضعیت امنیت
        </h2>
        <span
          className={`text-xs font-black px-3 py-1 rounded-full ${
            score >= 3
              ? "bg-[#22c55e]/20 text-[#86efac]"
              : "bg-[#fbbf24]/20 text-[#fde047]"
          }`}
        >
          {score}/4
        </span>
      </div>

      <StatusRow
        ok={status.password.strength === "strong"}
        label="رمز عبور قوی"
        detail={
          status.password.updatedAt
            ? `آخرین تغییر: ${new Date(status.password.updatedAt).toLocaleString("fa-IR")}`
            : `حداقل ${status.password.minLength} کاراکتر`
        }
      />
      <StatusRow
        ok={status.twoFactor.enabled}
        label="احراز هویت دو مرحله‌ای (2FA)"
        detail={status.twoFactor.enabled ? "فعال — Google Authenticator" : "غیرفعال"}
      />
      <StatusRow
        ok
        label="قفل پس از تلاش ناموفق"
        detail={`${status.lockout.maxAttempts} تلاش → قفل ${status.lockout.lockoutMinutes} دقیقه‌ای`}
      />
      <StatusRow
        ok={status.ipRestriction.enabled}
        label="محدودیت IP"
        detail={
          status.ipRestriction.enabled
            ? `${status.ipRestriction.allowedCount} IP مجاز`
            : "غیرفعال (همه IPها — از Netlify قابل تنظیم)"
        }
      />
      <StatusRow
        ok
        label="نشست امن"
        detail={`HttpOnly cookie — اعتبار ${status.sessionHours} ساعت`}
      />

      <Link href="/admin/settings" className="block mt-4">
        <Button variant="outline" size="sm" className="w-full font-bold gap-2">
          <Lock className="h-4 w-4" />
          تنظیمات امنیت و 2FA
        </Button>
      </Link>
      {!status.ipRestriction.enabled && (
        <p className="text-[10px] text-white/35 mt-3 flex items-start gap-1">
          <Globe className="h-3 w-3 shrink-0 mt-0.5" />
          برای محدودیت IP: متغیر ADMIN_ALLOWED_IPS را در Netlify تنظیم کنید.
        </p>
      )}
    </div>
  );
}