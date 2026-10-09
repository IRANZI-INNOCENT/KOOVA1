export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductAIAnalysis {
  id: number;
  model: string;
  result: Record<string, unknown>;
  confidence: number | null;
  created_at: string;
}

export interface Product {
  id: number;
  business: number;
  name: string;
  slug: string;
  sku: string;
  category: string;

  price: string;
  currency: string;
  stock: number | null;

  brand: string;
  material: string;
  size: string;
  color: string;
  condition: string;

  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;

  selling_points: string[];
  keywords: string[];

  visual_attributes: Record<string, unknown>;
  uncertain_attributes: string[];

  ai_summary: string;
  ai_confidence: number | null;
  ai_generated: boolean;

  status: "draft" | "active" | "archived";

  images: ProductImage[];
  ai_analyses: ProductAIAnalysis[];

  created_at: string;
  updated_at: string;
}

export interface CommercePage {
  id: number;
  business: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  whatsapp: string;
  email: string;
  phone: string;
  location: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}