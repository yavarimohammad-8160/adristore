"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Link2, FileText, GripVertical } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/format";
import type { SiteCustomPage, SiteNavLink, SiteSettings } from "@/lib/site-settings";
import { DEFAULT_FREE_SHIPPING_THRESHOLD } from "@/lib/site-settings-constants";

function newPageId() {
  return `page-${Date.now()}`;
}

function newLinkId() {
  return `link-${Date.now()}`;
}

export function ContentManager() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-settings");
      if (!res.ok) throw new Error();
      setSettings(await res.json());
    } catch {
      toast.error("خطا در بارگذاری تنظیمات سایت");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeShippingThreshold: settings.freeShippingThreshold,
          navLinks: settings.navLinks,
          customPages: settings.customPages,
        }),
      });
      if (!res.ok) throw new Error();
      setSettings(await res.json());
      toast.success("تنظیمات سایت ذخیره شد");
    } catch {
      toast.error("خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  function updateNavLink(id: string, patch: Partial<SiteNavLink>) {
    if (!settings) return;
    setSettings({
      ...settings,
      navLinks: settings.navLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  }

  function addNavLink() {
    if (!settings) return;
    const order = settings.navLinks.length;
    setSettings({
      ...settings,
      navLinks: [
        ...settings.navLinks,
        {
          id: newLinkId(),
          label: "لینک جدید",
          href: "/",
          enabled: true,
          order,
          color: "hover:text-white",
        },
      ],
    });
  }

  function removeNavLink(id: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      navLinks: settings.navLinks.filter((l) => l.id !== id),
    });
  }

  function addCustomPage() {
    if (!settings) return;
    const now = new Date().toISOString();
    const page: SiteCustomPage = {
      id: newPageId(),
      slug: "page-new",
      title: "صفحه جدید",
      description: "",
      content: "متن صفحه را اینجا بنویسید.",
      showInNav: true,
      navLabel: "صفحه جدید",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    setSettings({ ...settings, customPages: [...settings.customPages, page] });
  }

  function updatePage(id: string, patch: Partial<SiteCustomPage>) {
    if (!settings) return;
    setSettings({
      ...settings,
      customPages: settings.customPages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function removePage(id: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      customPages: settings.customPages.filter((p) => p.id !== id),
    });
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-white/60 py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <AdminHeader
        title="صفحات و منو"
        subtitle="مدیریت لینک‌های ناوبری، صفحات جدید و ارسال رایگان"
        action={
          <Button onClick={save} disabled={saving} className="btn-fun btn-primary font-bold">
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            ذخیره تغییرات
          </Button>
        }
      />

      <section className="rounded-2xl border-2 border-[#22c55e]/30 bg-[#111827]/60 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">ارسال رایگان</h2>
        <Label className="text-white/70 text-sm">حداقل مبلغ خرید (تومان)</Label>
        <Input
          type="number"
          min={0}
          step={10000}
          value={settings.freeShippingThreshold}
          onChange={(e) =>
            setSettings({
              ...settings,
              freeShippingThreshold: Number(e.target.value) || DEFAULT_FREE_SHIPPING_THRESHOLD,
            })
          }
          className="filter-input h-11 mt-2 max-w-xs"
          dir="ltr"
        />
        <p className="text-xs text-white/45 mt-2">
          نمایش: خرید بالای {formatPrice(settings.freeShippingThreshold)} ارسال رایگان
        </p>
      </section>

      <section className="rounded-2xl border-2 border-[#1e40af]/30 bg-[#111827]/60 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#93c5fd]" />
            لینک‌های منو
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addNavLink}>
            <Plus className="h-4 w-4 ml-1" /> افزودن لینک
          </Button>
        </div>

        <div className="space-y-3">
          {settings.navLinks
            .sort((a, b) => a.order - b.order)
            .map((link) => (
              <div
                key={link.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-white/40">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-mono">{link.id}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white/50">عنوان</Label>
                    <Input
                      value={link.label}
                      onChange={(e) => updateNavLink(link.id, { label: e.target.value })}
                      className="filter-input h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">آدرس (href)</Label>
                    <Input
                      value={link.href}
                      onChange={(e) => updateNavLink(link.id, { href: e.target.value })}
                      className="filter-input h-10 mt-1"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={link.enabled}
                      onCheckedChange={(v) => updateNavLink(link.id, { enabled: v === true })}
                    />
                    فعال
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!link.external}
                      onCheckedChange={(v) => updateNavLink(link.id, { external: v === true })}
                    />
                    لینک خارجی
                  </label>
                  <Input
                    type="number"
                    value={link.order}
                    onChange={(e) => updateNavLink(link.id, { order: Number(e.target.value) })}
                    className="filter-input h-9 w-20"
                    dir="ltr"
                    title="ترتیب"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#ef4444] mr-auto"
                    onClick={() => removeNavLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#a78bfa]/30 bg-[#111827]/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#a78bfa]" />
            صفحات سفارشی
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addCustomPage}>
            <Plus className="h-4 w-4 ml-1" /> صفحه جدید
          </Button>
        </div>

        {settings.customPages.length === 0 ? (
          <p className="text-sm text-white/50">هنوز صفحه‌ای ساخته نشده.</p>
        ) : (
          <div className="space-y-4">
            {settings.customPages.map((page) => (
              <div
                key={page.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-white/50">عنوان صفحه</Label>
                    <Input
                      value={page.title}
                      onChange={(e) => updatePage(page.id, { title: e.target.value })}
                      className="filter-input h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-white/50">نامک (slug)</Label>
                    <Input
                      value={page.slug}
                      onChange={(e) => updatePage(page.id, { slug: e.target.value })}
                      className="filter-input h-10 mt-1"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-white/40 mt-1">/pages/{page.slug}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-white/50">متن (پاراگراف‌ها با خط خالی جدا شوند)</Label>
                  <textarea
                    value={page.content}
                    onChange={(e) => updatePage(page.id, { content: e.target.value })}
                    rows={4}
                    className="filter-input w-full mt-1 rounded-xl p-3 text-sm resize-y min-h-[100px]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={page.showInNav}
                      onCheckedChange={(v) => updatePage(page.id, { showInNav: v === true })}
                    />
                    نمایش در منو
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={page.enabled}
                      onCheckedChange={(v) => updatePage(page.id, { enabled: v === true })}
                    />
                    فعال
                  </label>
                  {page.showInNav && (
                    <Input
                      value={page.navLabel || page.title}
                      onChange={(e) => updatePage(page.id, { navLabel: e.target.value })}
                      placeholder="عنوان در منو"
                      className="filter-input h-9 max-w-[180px]"
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[#ef4444] mr-auto"
                    onClick={() => removePage(page.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}