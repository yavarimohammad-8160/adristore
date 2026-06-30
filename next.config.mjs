/**
 * Next.js config — server mode by default; static export when
 * NEXT_PUBLIC_STATIC_EXPORT=1 (set by `npm run build:cloudflare`).
 */
/** @type {import('next').NextConfig} */

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: {
          unoptimized: true,
          remotePatterns: [
            { protocol: "https", hostname: "statics.basalam.com" },
            { protocol: "https", hostname: "static.basalam.com" },
            { protocol: "https", hostname: "cdn.basalam.com" },
            { protocol: "https", hostname: "basalam.com" },
            { protocol: "https", hostname: "picsum.photos" },
          ],
        },
        experimental: {
          optimizePackageImports: [
            "lucide-react",
            "@base-ui/react",
            "sonner",
            "recharts",
          ],
        },
      }
    : {
        experimental: {
          optimizePackageImports: ["@base-ui/react", "sonner"],
        },
        async headers() {
          return [
            { source: "/(.*)", headers: SECURITY_HEADERS },
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
            {
              source: "/favicon.ico",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=86400, stale-while-revalidate=604800",
                },
              ],
            },
          ];
        },
        images: {
          formats: ["image/avif", "image/webp"],
          minimumCacheTTL: 3600,
          remotePatterns: [
            { protocol: "https", hostname: "static.basalam.com" },
            { protocol: "https", hostname: "cdn.basalam.com" },
            { protocol: "https", hostname: "basalam.com" },
            { protocol: "https", hostname: "picsum.photos" },
            { protocol: "https", hostname: "api.qrserver.com" },
            { protocol: "https", hostname: "img.youtube.com" },
          ],
        },
      }),
};

export default nextConfig;