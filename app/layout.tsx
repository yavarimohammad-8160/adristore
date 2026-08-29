import type { Metadata } from "next";
import { Vazirmatn, Lalezar } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/AppToaster";
import { CartProvider } from "@/components/CartContext";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SITE_URL, DEFAULT_KEYWORDS, HOME_TITLE, homeMetadata } from "@/lib/seo";
import { getEnabledNavLinks, getSiteSettings } from "@/lib/site-settings";
/** ISR — keep in sync with lib/cache-config.ts REVALIDATE.storefront */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const vazirmatn = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const lalezar = Lalezar({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...homeMetadata,
  title: {
    default: HOME_TITLE,
    template: "%s | کیمدی کارت — آدری‌استور",
  },
  keywords: DEFAULT_KEYWORDS,
  icons: { icon: "/favicon.ico" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${lalezar.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0f1e] text-white font-sans">
        <GoogleAnalytics />
        <CartProvider>
          <ConditionalNavbar
            navLinks={getEnabledNavLinks(siteSettings)}
            freeShippingThreshold={siteSettings.freeShippingThreshold}
            isFreeShippingEnabled={siteSettings.isFreeShippingEnabled}
          />
          {children}
          <ConditionalFooter />
        </CartProvider>
        <AppToaster />
      </body>
    </html>
  );
}
