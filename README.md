# ⚽ آدری استور — فروشگاه کارت فوتبال کلکسیونی

سایت مدرن و سریع فروشگاه باسلام **آدری استور** با تم کارت‌های فوتبال (trading cards). ساخته شده با Next.js 16 + TypeScript + Tailwind + shadcn/ui.

- ظاهر دارک با رنگ‌های سبز چمن و قرمز کارت
- انیمیشن چرخش کارت (flip) روی هاور
- دریافت پویا محصولات از **API رسمی باسلام**
- صفحه محصول، جستجو، فیلتر قیمت، مرتب‌سازی
- سبد خرید ساده (local) + دکمه «خرید در باسلام»
- آماده برای دیپلوی روی Vercel + SEO (متادیتا + sitemap)

## شروع سریع

### ۱. کلون و نصب

```bash
git clone <your-repo>
cd adristore
npm install
```

### ۲. تنظیم توکن باسلام (ضروری برای دریافت واقعی محصولات)

```bash
cp .env.example .env.local
```

در `.env.local`:

```env
BASALAM_TOKEN=توکن_شخصی_شما
BASALAM_VENDOR_ID=1213430
```

**دریافت توکن:**
1. به https://developers.basalam.com/panel/tokens بروید
2. توکن دسترسی شخصی (Personal Access Token) بسازید
3. اسکوپ `vendor.product.read` یا مشابه را فعال کنید

> **نکته:** اگر توکن تنظیم نشود، سایت از داده‌های نمونه (mock) استفاده می‌کند تا بتوانید UI را ببینید.

### ۳. اجرا

```bash
npm run dev
```

سایت روی http://localhost:3000 در دسترس است.

## ساختار مهم

- `lib/basalam.ts` — کلاینت مستقیم fetch به `openapi.basalam.com`
- `lib/types.ts` — تایپ‌های Product و پاسخ‌ها
- `app/products/page.tsx` — لیست کامل + جستجو و فیلترهای کلاینت ساید
- `app/products/[id]/page.tsx` — صفحه جزئیات محصول با فليپ کارت
- `components/ProductCard.tsx` — کامپوننت کارت فوتبال با انیمیشن چرخش

## دریافت محصولات از API باسلام (توضیح)

دو راه وجود دارد:

### A. استفاده مستقیم از fetch (توصیه شده برای Next.js)

```ts
const res = await fetch(
  `https://openapi.basalam.com/v1/vendors/${vendorId}/products?page=1&per_page=30`,
  { headers: { Authorization: `Bearer ${process.env.BASALAM_TOKEN}` } }
);
```

### B. Python SDK (برای اسکریپت، بیلد یا بک‌اند جدا)

```bash
pip install basalam-sdk
```

```python
from basalam_sdk import BasalamClient, PersonalToken

client = BasalamClient(auth=PersonalToken(token="YOUR_TOKEN"))
products = await client.get_vendor_products(vendor_id=1213430, ...)
```

سایت فعلی از روش A استفاده می‌کند چون کاملاً فرانت‌اند/سرور Next.js است.

## ویژگی‌ها

- **Hero** با تم فوتبال + کارت
- جستجو، فیلتر قیمت، مرتب‌سازی
- بارگذاری تنبل + دکمه Load More (مناسب ۱۰۰۰+ محصول)
- سبد خرید که به لینک باسلام ارجاع می‌دهد
- کارت‌ها با انیمیشن واقعی flip
- کاملاً ریسپانسیو + راست‌چین (فارسی)

## دیپلوی روی Vercel

1. پوشه پروژه را به گیت‌هاب پوش کنید
2. در Vercel پروژه جدید بسازید (Next.js تشخیص خودکار)
3. متغیرهای محیطی را ست کنید:
   - `BASALAM_TOKEN`
   - `BASALAM_VENDOR_ID`
4. Deploy

سایت آمادهٔ پروداکشن و خیلی سریع خواهد بود (Static + dynamic data fetching).

## نکات بعدی

- برای لینک مستقیم محصول باسلام، می‌توانید از فیلد `url` در پاسخ محصول استفاده کنید.
- برای فیلترهای پیچیده‌تر (بازیکن خاص / تیم) می‌توانید تگ‌ها را از عنوان استخراج یا فیلدهای اضافی از API بگیرید.
- کش کردن قوی‌تر را با `revalidate` یا ISR تنظیم کنید.

---

ساخته شده برای **adristore** • فوتبال • کلکسیون
