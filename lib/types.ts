export interface Photo {
  id?: number;
  original?: string;
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  /** Original Basalam CDN URL — storefront fallback when jsDelivr 404s. */
  remote?: string;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  photo?: Photo | null;
  photos?: Photo[];
  inventory?: number;
  description?: string;
  brief?: string;
  category?: string;
  seriesId?: string;
  tags?: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  status?: {
    name?: string;
    value?: number;
  };
  is_wholesale?: boolean;
  url?: string;
  created_at?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Vendor {
  id: number;
  identifier: string;
  title: string;
  summary?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type FilterState = {
  search: string;
  minPrice: number;
  maxPrice: number;
  sort: "default" | "price-low" | "price-high" | "newest";
  rarity: string[]; // derived client-side keywords like "امضا", "طلایی", etc.
};
