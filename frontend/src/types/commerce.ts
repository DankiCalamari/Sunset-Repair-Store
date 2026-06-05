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
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  alt_address_line1: string | null;
  alt_city: string | null;
  alt_postcode: string | null;
  gps_lat: string | null;
  gps_lng: string | null;
  gate_code: string | null;
  property_notes: string | null;
  contact_instructions: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: string;
  business_id: string;
  customer_id: string;
  device_type: string;
  manufacturer: string;
  model: string;
  colour: string | null;
  imei: string | null;
  serial_number: string | null;
  passcode_provided: string | null;
  accessories_received: string[];
  warranty_status: string | null;
  notes: string | null;
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
  customer_name?: string | null;
  device_info?: string | null;
  issue_description: string;
  diagnostic_notes?: string | null;
  status: string;
  priority: string;
  assigned_technician_id?: string | null;
  appointment_type?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  service_address_line1?: string | null;
  service_city?: string | null;
  service_postcode?: string | null;
  gate_code?: string | null;
  property_notes?: string | null;
  contact_instructions?: string | null;
  pickup_signature?: string | null;
  return_signature?: string | null;
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

export interface TicketInternalNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface TicketCommunication {
  id: string;
  ticket_id: string;
  channel: "email" | "sms" | "portal" | string;
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

export interface TicketPhoto {
  id: string;
  ticket_id: string;
  category: string;
  data_url: string;
  caption: string | null;
  created_at: string;
}

export interface DeviceConditionReport {
  id: string;
  ticket_id: string;
  device_id: string;
  screen_condition: string | null;
  frame_condition: string | null;
  rear_cover_condition: string | null;
  camera_condition: string | null;
  buttons_condition: string | null;
  charging_port_condition: string | null;
  water_damage_indicator: string | null;
  existing_damage_notes: string | null;
  created_at: string;
}

export interface TrackerStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface TrackerResponse {
  ticket_number: string;
  status: string;
  steps: TrackerStep[];
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
  ticket_id: string | null;
  service_type_id: string;
  service_type_name: string | null;
  appointment_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  gate_code: string | null;
  property_notes: string | null;
  contact_instructions: string | null;
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

export interface DocumentTemplate {
  title: string;
  subtitle: string;
  show_logo: boolean;
  show_business_address: boolean;
  show_business_contact: boolean;
  show_abn: boolean;
  show_ticket_number: boolean;
  show_customer_phone: boolean;
  show_customer_email: boolean;
  show_page_numbers: boolean;
  show_line_type: boolean;
  table_style: string;
  accent_bar: boolean;
  terms_text: string;
  footer_text: string;
  logo_max_height_mm: number;
}

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplate = {
  title: "",
  subtitle: "",
  show_logo: true,
  show_business_address: true,
  show_business_contact: true,
  show_abn: true,
  show_ticket_number: true,
  show_customer_phone: true,
  show_customer_email: true,
  show_page_numbers: true,
  show_line_type: true,
  table_style: "striped",
  accent_bar: true,
  terms_text: "",
  footer_text: "Thank you for your business.",
  logo_max_height_mm: 18,
};

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
  quote_template_json: DocumentTemplate;
  invoice_template_json: DocumentTemplate;
  email_settings: Record<string, unknown>;
  sms_settings: Record<string, unknown>;
}

// Mobile repair workflow status config
export const TICKET_STATUSES = [
  "new", "booked", "travelling", "collected",
  "diagnosing", "awaiting_approval", "awaiting_parts",
  "repairing", "testing", "ready_for_return",
  "delivered", "completed", "cancelled",
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "#6b7280", bg: "#f3f4f6" },
  booked: { label: "Booked", color: "#2563eb", bg: "#dbeafe" },
  travelling: { label: "Travelling", color: "#7c3aed", bg: "#ede9fe" },
  collected: { label: "Collected", color: "#0891b2", bg: "#cffafe" },
  diagnosing: { label: "Diagnosing", color: "#d97706", bg: "#fef3c7" },
  awaiting_approval: { label: "Awaiting Approval", color: "#ea580c", bg: "#ffedd5" },
  awaiting_parts: { label: "Awaiting Parts", color: "#dc2626", bg: "#fee2e2" },
  repairing: { label: "Repairing", color: "#4f46e5", bg: "#e0e7ff" },
  testing: { label: "Testing", color: "#0d9488", bg: "#ccfbf1" },
  ready_for_return: { label: "Ready For Return", color: "#16a34a", bg: "#dcfce7" },
  delivered: { label: "Delivered", color: "#059669", bg: "#d1fae5" },
  completed: { label: "Completed", color: "#15803d", bg: "#bbf7d0" },
  cancelled: { label: "Cancelled", color: "#991b1b", bg: "#fecaca" },
};
