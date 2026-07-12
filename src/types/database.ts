// ─── Supabase Database Type Definitions ───────────────────────────────────────
// This file is the source of truth for all DB entity shapes used in the app.
// IMPORTANT: price_proveedor is typed but must NEVER be exposed via public queries.
// Only accessible via get_supplier_products() RPC for role='proveedor'.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id'>;
        Update: Partial<Omit<Category, 'id'>>;
        Relationships: any[];
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
        Relationships: any[];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at'>>;
        Relationships: any[];
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id'>;
        Update: Partial<Omit<OrderItem, 'id'>>;
        Relationships: any[];
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'id' | 'created_at'>;
        Update: Partial<Omit<Supplier, 'id' | 'created_at'>>;
        Relationships: any[];
      };
      sync_logs: {
        Row: SyncLog;
        Insert: Omit<SyncLog, 'id'>;
        Update: Partial<Omit<SyncLog, 'id'>>;
        Relationships: any[];
      };
      site_content: {
        Row: SiteContent;
        Insert: SiteContent;
        Update: Partial<SiteContent>;
        Relationships: any[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_supplier_products: {
        Args: { category_id?: string };
        Returns: SupplierProduct[];
      };
    };
    Enums: {
      order_status: 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado';
      order_tipo: 'publico' | 'mayoreo';
      product_source: 'sheet' | 'manual';
      supplier_status: 'pendiente' | 'aprobado' | 'rechazado';
      sync_status: 'en_progreso' | 'completado' | 'error';
    };
  };
}

// ─── Entity Interfaces ─────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Public product shape — price_proveedor is intentionally OMITTED here.
 * Use SupplierProduct for the full shape (proveedor role only via RPC).
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  price_publico: number;
  price_promo: number | null;
  stock: number;
  image_url: string | null;
  featured_label: string | null;
  is_active: boolean;
  source: 'sheet' | 'manual';
  created_at: string;
  updated_at: string;
}

/**
 * Extended product with supplier price — returned ONLY by get_supplier_products() RPC.
 * Never fetched via direct select on products table.
 */
export interface SupplierProduct extends Product {
  price_proveedor: number | null;
}

export interface Order {
  id: string;
  user_id: string;
  tipo: 'publico' | 'mayoreo';
  status: 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado';
  total_amount: number;
  shipping_address: Json;
  tracking_info: Json | null;
  stripe_payment_intent: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface Supplier {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  rfc: string | null;
  category_interest: string | null;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  admin_notes: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'en_progreso' | 'completado' | 'error';
  inserted_count: number;
  updated_count: number;
  deactivated_count: number;
  error_message: string | null;
}

export interface SiteContent {
  id: string;
  content_data: Json;
  updated_at: string;
}

// ─── Cart Types (UI State — Zustand only) ─────────────────────────────────────

export interface CartItem {
  product_id: string;
  name: string;
  brand: string | null;
  price_publico: number;
  price_promo: number | null;
  price_proveedor: number | null; // Only populated for proveedor users
  image_url: string | null;
  quantity: number;
  stock: number;
}

// ─── Auth Types ────────────────────────────────────────────────────────────────

export type UserRole = 'cliente' | 'proveedor' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
