import type { User } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const buildUrl = (path: string) => {
  const base = API_BASE.replace(/\/+$/g, "");
  let normalizedPath = path;
  if (base.endsWith("/api") && normalizedPath.startsWith("/api")) {
    normalizedPath = normalizedPath.replace(/^\/api/, "");
  }
  return `${base}${normalizedPath}`;
};

export type ApiError = { detail: string; code?: string };

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(buildUrl(path), { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = err.detail;
      if (typeof detail === "object" && detail?.detail) {
        throw new Error(detail.detail);
      }
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(err));
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error("Cannot reach the API. Start the backend with: docker compose up -d");
    }
    throw error;
  }
}

export const setupApi = {
  status: () => api<{ needs_setup: boolean }>("/api/v1/setup/status"),
  sendVerificationCode: (owner_email: string) =>
    api<{ code_sent: boolean; debug_code?: string }>("/api/v1/setup/verification", {
      method: "POST",
      body: JSON.stringify({ owner_email }),
    }),
  run: (data: {
    business_name: string;
    business_slug: string;
    legal_name?: string;
    abn?: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    timezone: string;
    currency: string;
    ticket_prefix: string;
    tax_rate: number;
    owner_name: string;
    owner_email: string;
    owner_password: string;
    verification_code?: string;
  }) =>
    api<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>("/api/v1/setup", { method: "POST", body: JSON.stringify(data) }),
};

export const authApi = {
  login: (email: string, password: string, business_slug?: string) =>
    api<{
      access_token: string;
      refresh_token: string;
      user: { id: string; email: string; full_name: string; role: string; permissions: string[] };
    }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, business_slug }),
    }),
  me: () =>
    api<{ id: string; email: string; full_name: string; role: string; permissions: string[] }>(
      "/api/v1/auth/me"
    ),
};

export const dashboardApi = {
  summary: () =>
    api<{
      repairs_today: number;
      revenue_today: number;
      repairs_in_progress: number;
      devices_waiting_pickup: number;
      low_stock_count: number;
    }>("/api/v1/dashboard/summary"),
};

export const customersApi = {
  list: (q?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").Customer>>(
      `/api/v1/customers?q=${encodeURIComponent(q || "")}&page=${page}`
    ),
  create: (data: Partial<import("@/types/commerce").Customer>) =>
    api<import("@/types/commerce").Customer>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import("@/types/commerce").Customer>) =>
    api<import("@/types/commerce").Customer>(`/api/v1/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  repairs: (id: string) =>
    api<import("@/types/commerce").RepairTicket[]>(`/api/v1/customers/${id}/repairs`),
  quotes: (id: string) =>
    api<import("@/types/commerce").Quote[]>(`/api/v1/customers/${id}/quotes`),
  invoices: (id: string) =>
    api<import("@/types/commerce").Invoice[]>(`/api/v1/customers/${id}/invoices`),
};

export const ticketsApi = {
  list: (page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").RepairTicket>>(
      `/api/v1/tickets?page=${page}&page_size=50`
    ),
  get: (id: string) => api<import("@/types/commerce").RepairTicket>(`/api/v1/tickets/${id}`),
  timeline: (id: string) =>
    api<import("@/types/commerce").TimelineEntry[]>(`/api/v1/tickets/${id}/timeline`),
  communications: (id: string) =>
    api<import("@/types/commerce").TicketCommunication[]>(`/api/v1/tickets/${id}/communications`),
  template: (id: string, eventKey: string) =>
    api<{ subject: string; body_html: string }>(
      `/api/v1/tickets/${id}/communications/template/${eventKey}`
    ),
  sendEmail: (
    id: string,
    data: {
      to?: string;
      subject: string;
      body_html: string;
      body_text?: string;
      attachments?: { filename: string; content_type: string; content_base64: string }[];
    }
  ) =>
    api<import("@/types/commerce").TicketCommunication>(
      `/api/v1/tickets/${id}/communications/email`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  sendSms: (id: string, data: { to?: string; message: string }) =>
    api<import("@/types/commerce").TicketCommunication>(
      `/api/v1/tickets/${id}/communications/sms`,
      { method: "POST", body: JSON.stringify(data) }
    ),
};

export const quotesApi = {
  list: (status?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").Quote>>(
      `/api/v1/quotes?${status ? `status=${status}&` : ""}page=${page}`
    ),
  get: (id: string) => api<import("@/types/commerce").Quote>(`/api/v1/quotes/${id}`),
  create: (data: {
    ticket_id: string;
    lines: { line_type: string; description: string; quantity: number; unit_price: number }[];
    discount_amount?: number;
  }) =>
    api<import("@/types/commerce").Quote>("/api/v1/quotes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  send: (id: string) =>
    api<import("@/types/commerce").Quote>(`/api/v1/quotes/${id}/send`, { method: "POST" }),
  approve: (id: string) =>
    api<import("@/types/commerce").Quote>(`/api/v1/quotes/${id}/approve`, { method: "POST" }),
  reject: (id: string, reason?: string) =>
    api<import("@/types/commerce").Quote>(`/api/v1/quotes/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

export const invoicesApi = {
  list: (status?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").Invoice>>(
      `/api/v1/invoices?${status ? `status=${status}&` : ""}page=${page}`
    ),
  get: (id: string) => api<import("@/types/commerce").Invoice>(`/api/v1/invoices/${id}`),
  create: (data: {
    customer_id: string;
    ticket_id?: string;
    quote_id?: string;
    lines?: { description: string; quantity: number; unit_price: number }[];
  }) =>
    api<import("@/types/commerce").Invoice>("/api/v1/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  pay: (id: string, data: { amount: number; method: string; reference?: string }) =>
    api<import("@/types/commerce").Invoice>(`/api/v1/invoices/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const inventoryApi = {
  // Items
  list: (q?: string, page = 1, lowStock = false, categoryId?: string) =>
    api<PaginatedResponse<import("@/types/commerce").InventoryItem>>(
      `/api/v1/inventory/items?q=${encodeURIComponent(q || "")}&page=${page}&page_size=100${lowStock ? "&low_stock=true" : ""}${categoryId ? `&category_id=${categoryId}` : ""}`
    ),
  get: (id: string) =>
    api<import("@/types/commerce").InventoryItem>(`/api/v1/inventory/items/${id}`),
  byBarcode: (code: string) =>
    api<import("@/types/commerce").InventoryItem>(
      `/api/v1/inventory/items/by-barcode/${encodeURIComponent(code)}`
    ),
  create: (data: {
    sku: string;
    name: string;
    description?: string;
    barcode?: string;
    category_id?: string;
    unit_cost?: number;
    unit_price: number;
    quantity_on_hand?: number;
    reorder_level?: number;
  }) =>
    api<import("@/types/commerce").InventoryItem>("/api/v1/inventory/items", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      barcode: string | null;
      category_id: string | null;
      unit_cost: number;
      unit_price: number;
      reorder_level: number;
      is_active: boolean;
    }>
  ) =>
    api<import("@/types/commerce").InventoryItem>(`/api/v1/inventory/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deactivate: (id: string) =>
    api<void>(`/api/v1/inventory/items/${id}`, { method: "DELETE" }),
  adjust: (id: string, quantity: number, notes?: string) =>
    api<import("@/types/commerce").InventoryItem>(`/api/v1/inventory/items/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ quantity, notes }),
    }),
  movements: (id: string) =>
    api<import("@/types/commerce").StockMovement[]>(`/api/v1/inventory/items/${id}/movements`),

  // Categories
  categories: () =>
    api<import("@/types/commerce").InventoryCategory[]>("/api/v1/inventory/categories"),
  createCategory: (data: { name: string; slug: string }) =>
    api<import("@/types/commerce").InventoryCategory>("/api/v1/inventory/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: { name?: string; slug?: string }) =>
    api<import("@/types/commerce").InventoryCategory>(`/api/v1/inventory/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    api<void>(`/api/v1/inventory/categories/${id}`, { method: "DELETE" }),

  // Suppliers
  suppliers: (q?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").Supplier>>(
      `/api/v1/inventory/suppliers?q=${encodeURIComponent(q || "")}&page=${page}`
    ),
  createSupplier: (data: {
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) =>
    api<import("@/types/commerce").Supplier>("/api/v1/inventory/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSupplier: (
    id: string,
    data: Partial<{ name: string; contact_name: string; email: string; phone: string; notes: string }>
  ) =>
    api<import("@/types/commerce").Supplier>(`/api/v1/inventory/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: string) =>
    api<void>(`/api/v1/inventory/suppliers/${id}`, { method: "DELETE" }),

  // Purchase Orders
  purchaseOrders: (status?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").PurchaseOrder>>(
      `/api/v1/inventory/purchase-orders?${status ? `status=${status}&` : ""}page=${page}`
    ),
  getPurchaseOrder: (id: string) =>
    api<import("@/types/commerce").PurchaseOrder>(`/api/v1/inventory/purchase-orders/${id}`),
  createPurchaseOrder: (data: {
    supplier_id: string;
    notes?: string;
    lines: { inventory_item_id: string; quantity_ordered: number; unit_cost: number }[];
  }) =>
    api<import("@/types/commerce").PurchaseOrder>("/api/v1/inventory/purchase-orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submitPurchaseOrder: (id: string) =>
    api<import("@/types/commerce").PurchaseOrder>(`/api/v1/inventory/purchase-orders/${id}/submit`, {
      method: "POST",
    }),
  receivePurchaseOrder: (
    id: string,
    lines: { line_id: string; quantity_received: number }[]
  ) =>
    api<import("@/types/commerce").PurchaseOrder>(`/api/v1/inventory/purchase-orders/${id}/receive`, {
      method: "POST",
      body: JSON.stringify(lines),
    }),
};

export const appointmentsApi = {
  serviceTypes: () => api<import("@/types/commerce").ServiceType[]>("/api/v1/service-types"),
  list: (status?: string, page = 1) =>
    api<PaginatedResponse<import("@/types/commerce").Appointment>>(
      `/api/v1/appointments?${status ? `status=${status}&` : ""}page=${page}&page_size=100`
    ),
  create: (data: {
    customer_id?: string;
    service_type_id: string;
    scheduled_start: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    notes?: string;
  }) =>
    api<import("@/types/commerce").Appointment>("/api/v1/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { status?: string; scheduled_start?: string; service_type_id?: string }) =>
    api<import("@/types/commerce").Appointment>(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export const posApi = {
  createSale: (data: {
    customer_id?: string;
    payment_method: string;
    lines: { inventory_item_id: string; quantity: number }[];
  }) =>
    api<import("@/types/commerce").PosSale>("/api/v1/pos/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const reportsApi = {
  revenue: () => api<import("@/types/commerce").RevenueReport>("/api/v1/reports/revenue"),
  technicians: () => api<import("@/types/commerce").TechnicianReportRow[]>("/api/v1/reports/technicians"),
  commonRepairs: () => api<import("@/types/commerce").CommonRepairRow[]>("/api/v1/reports/common-repairs"),
  inventory: () => api<import("@/types/commerce").InventoryReport>("/api/v1/reports/inventory"),
  warranty: () => api<import("@/types/commerce").WarrantyReport>("/api/v1/reports/warranty"),
};

export const adminApi = {
  users: () => api<import("@/types/commerce").AdminUser[]>("/api/v1/admin/users"),
  createUser: (data: {
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    password: string;
    is_active?: boolean;
  }) =>
    api<import("@/types/commerce").AdminUser>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUser: (
    id: string,
    data: Partial<{
      email: string;
      full_name: string;
      phone: string;
      role: string;
      password: string;
      is_active: boolean;
    }>
  ) =>
    api<import("@/types/commerce").AdminUser>(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  settings: () => api<import("@/types/commerce").BusinessSettings>("/api/v1/admin/settings"),
  updateSettings: (
    data: Partial<{
      business_name: string;
      email: string | null;
      phone: string;
      tax_rate: number;
      ticket_prefix: string;
      next_ticket_seq: number;
      smtp: Record<string, unknown>;
      imap: Record<string, unknown>;
      telnyx: Record<string, unknown>;
      automations: Record<string, unknown>;
    }>
  ) =>
    api<import("@/types/commerce").BusinessSettings>("/api/v1/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}
