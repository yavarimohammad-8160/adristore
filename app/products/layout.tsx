import type { Metadata } from "next";
import { productsCatalogMetadata } from "@/lib/seo";
export const revalidate = 300;
export const metadata: Metadata = productsCatalogMetadata;

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}