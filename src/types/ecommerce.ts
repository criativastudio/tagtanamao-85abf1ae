// E-commerce type definitions

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  image_url: string | null;
  is_active: boolean | null;
  gallery_images: string[] | null;
  created_at: string | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  asaas_payment_link: string | null;
  asaas_payment_id: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_cost: number | null;
  shipping_method: string | null;
  shipping_label_url: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  product_id: string | null;
  pet_tag_id: string | null;
  display_id: string | null;
  quantity: number;
  unit_price: number;
  created_at: string | null;
  product?: Product;
  customer_art?: CustomerArt;
}

export interface ElementPositions {
  qr_code?: { x: number; y: number; width: number; height: number };
  logo?: { x: number; y: number; width: number; height: number };
  company_name?: { x: number; y: number; fontSize: number; textAnchor?: 'start' | 'middle' | 'end' };
  order_number?: { x: number; y: number; fontSize: number; textAnchor?: 'start' | 'middle' | 'end' };
}

export interface ArtTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  svg_content: string;
  editable_fields: EditableField[];
  element_positions: ElementPositions | null;
  product_type: string;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface EditableField {
  id: string;
  name: string;
  type: 'text' | 'image' | 'color';
  placeholder?: string;
  defaultValue?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface CustomerArt {
  id: string;
  user_id: string | null;
  order_item_id: string | null;
  template_id: string | null;
  custom_data: Record<string, string>;
  logo_url: string | null;
  final_svg: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  template?: ArtTemplate;
}

export interface ShippingQuote {
  service: string;
  carrier: string;
  price: number;
  delivery_time: number;
  serviceCode?: string;
  carrierPicture?: string;
}

export interface DisplayArt {
  id: string;
  order_id: string;
  order_item_id: string | null;
  user_id: string;
  template_id: string | null;
  logo_url: string | null;
  company_name: string | null;
  qr_code_id: string | null;
  final_svg: string | null;
  final_pdf_url: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
  template?: ArtTemplate;
  qr_code?: QrCode;
}

export interface QrCode {
  id: string;
  code: string;
  order_id: string | null;
  display_art_id: string | null;
  is_used: boolean;
  created_at: string;
}

export type OrderStatus = 
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'awaiting_customization'
  | 'art_finalized'
  | 'ready_to_ship';

export type PaymentStatus = 
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'refunded';
