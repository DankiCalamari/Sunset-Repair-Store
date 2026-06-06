import { api } from "@/lib/api";

export const setupApi = {
  status: () =>
    api<{ needs_setup: boolean }>("/api/v1/setup/status"),
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
      user: { id: string; email: string; full_name: string; role: string; permissions: string[] };
    }>("/api/v1/setup", { method: "POST", body: JSON.stringify(data) }),
};