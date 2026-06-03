const API_BASE = import.meta.env.VITE_API_URL ?? "";
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY ?? "";

const buildUrl = (path: string) => {
  const base = API_BASE.replace(/\/+$/g, "");
  let normalizedPath = path;
  if (base.endsWith("/api") && normalizedPath.startsWith("/api")) {
    normalizedPath = normalizedPath.replace(/^\/api/, "");
  }
  return `${base}${normalizedPath}`;
};

async function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (PUBLIC_API_KEY) headers["X-Public-Api-Key"] = PUBLIC_API_KEY;

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
}

export interface PublicBookingPayload {
  name: string;
  phone: string;
  email?: string;
  address: string;
  suburb: string;
  device_type: string;
  brand: string;
  model: string;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  service_type: string;
}

export interface PublicRepairStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface PublicTrackerResponse {
  ticket_number: string;
  status: string;
  steps: PublicRepairStep[];
}

export interface PublicPortalSummary {
  repairs: {
    id: string;
    ticket_number: string;
    status: string;
    issue_description: string;
    created_at: string;
  }[];
  quotes: { id: string; ticket_id: string; quote_number: string; status: string; total: string }[];
  invoices: {
    id: string;
    ticket_id: string | null;
    invoice_number: string;
    status: string;
    total: string;
    amount_paid: string;
  }[];
}

export const publicWebsiteApi = {
  createBooking: (data: PublicBookingPayload) =>
    publicApi<{ ticket_id: string; ticket_number: string; status: string }>("/api/v1/public/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  trackRepair: (ticket_reference: string, contact: string) =>
    publicApi<PublicTrackerResponse>("/api/v1/public/tracking", {
      method: "POST",
      body: JSON.stringify({ ticket_reference, contact }),
    }),
  portal: (contact: string) =>
    publicApi<PublicPortalSummary>(`/api/v1/public/portal?contact=${encodeURIComponent(contact)}`),
  sendMessage: (ticket_reference: string, contact: string, message: string) =>
    publicApi<{ ok: boolean; message_id: string }>("/api/v1/public/messages", {
      method: "POST",
      body: JSON.stringify({ ticket_reference, contact, message }),
    }),
  submitWarrantyClaim: (ticket_reference: string, contact: string, issue: string, message: string) =>
    publicApi<{ ok: boolean; claim_id: string }>("/api/v1/public/warranty-claims", {
      method: "POST",
      body: JSON.stringify({ ticket_reference, contact, issue, message }),
    }),
  approveQuote: (quoteId: string, ticket_reference: string, contact: string) =>
    publicApi<{ ok: boolean; status: string }>(`/api/v1/public/quotes/${quoteId}/approve`, {
      method: "POST",
      body: JSON.stringify({ ticket_reference, contact }),
    }),
  downloadInvoice: async (invoiceId: string, ticket_reference: string, contact: string) => {
    const headers: Record<string, string> = {};
    if (PUBLIC_API_KEY) headers["X-Public-Api-Key"] = PUBLIC_API_KEY;
    const res = await fetch(
      buildUrl(
        `/api/v1/public/invoices/${invoiceId}/pdf?ticket_reference=${encodeURIComponent(ticket_reference)}&contact=${encodeURIComponent(contact)}`
      ),
      { headers }
    );
    if (!res.ok) throw new Error("Invoice download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `invoice-${invoiceId}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

export function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}
