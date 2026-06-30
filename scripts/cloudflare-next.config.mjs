/**
 * Cloudflare Pages static-export config.
 * Copied to next.config.mjs during `npm run build:cloudflare` (takes precedence over next.config.ts).
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@base-ui/react", "sonner", "recharts"],
  },
};

export default nextConfig;