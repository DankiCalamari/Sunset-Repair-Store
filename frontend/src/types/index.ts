export type UserRole = "owner" | "manager" | "technician" | "sales" | "customer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  business_id?: string;
  permissions: string[];
}

export type TicketStatus =
  | "new"
  | "diagnosing"
  | "waiting_approval"
  | "waiting_parts"
  | "repairing"
  | "testing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export interface RepairTicket {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  issue_description: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
}

export interface TrackerStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}
