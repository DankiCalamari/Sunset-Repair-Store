export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface QuoteLine {
  id: string;
  line_type: string;
  description: string;
  quantity: string;
  unit_price: string;
  sort_order: number;
}

export interface Quote {
  id: string;
  ticket_id: string;
  quote_number: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  valid_until: string | null;
  customer_id: string | null;
  customer_name: string | null;
  ticket_number: string | null;
  lines: QuoteLine[];
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
}

export interface Payment {
  id: string;
  amount: string;
  method: string;
  reference: string | null;
  paid_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  ticket_id: string | null;
  invoice_number: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  amount_paid: string;
  customer_name: string | null;
  ticket_number: string | null;
  lines: InvoiceLine[];
  payments: Payment[];
  issued_at: string | null;
  created_at: string;
}

export interface RepairTicket {
  id: string;
  business_id?: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  issue_description: string;
  diagnostic_notes?: string | null;
  status: string;
  priority: string;
  assigned_technician_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface TimelineEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  is_customer_visible: boolean;
  created_at: string;
}

export interface TicketCommunication {
  id: string;
  ticket_id: string;
  channel: "email" | "sms" | string;
  direction: "inbound" | "outbound" | string;
  message_type: string;
  status: string;
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: { filename?: string; content_type?: string; size?: number }[];
  provider_message_id: string | null;
  in_reply_to: string | null;
  error_message: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  business_id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  unit_cost: string;
  unit_price: string;
  quantity_on_hand: number;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: string;
  business_id: string;
  name: string;
  slug: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by_id: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  inventory_item_id: string;
  item_name: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: string;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  supplier_name: string | null;
  po_number: string;
  status: string;
  ordered_at: string | null;
  received_at: string | null;
  notes: string | null;
  lines: PurchaseOrderLine[];
  created_at: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  customer_id: string | null;
  service_type_id: string;
  service_type_name: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface PosSaleLine {
  id: string;
  inventory_item_id: string;
  item_name: string | null;
  quantity: number;
  unit_price: string;
}

export interface PosSale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  payment_method: string;
  lines: PosSaleLine[];
  created_at: string;
}

export interface RevenueReport {
  invoice_revenue: string;
  pos_revenue: string;
  total_revenue: string;
  payments_collected: string;
  invoice_count: number;
  pos_sale_count: number;
}

export interface TechnicianReportRow {
  technician_id: string | null;
  technician_name: string;
  open_tickets: number;
  completed_tickets: number;
}

export interface CommonRepairRow {
  issue_description: string;
  count: number;
}

export interface InventoryReport {
  active_items: number;
  low_stock_items: number;
  stock_value: string;
}

export interface WarrantyReport {
  active_warranties: number;
  expiring_soon: number;
  open_claims: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface BusinessSettings {
  business_id: string;
  business_name: string;
  legal_name: string | null;
  abn: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  timezone: string;
  currency: string;
  tax_rate: number;
  ticket_prefix: string;
  next_ticket_seq: number;
  branding_json: Record<string, unknown>;
  email_settings: Record<string, unknown>;
  sms_settings: Record<string, unknown>;
}
