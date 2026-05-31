import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/types";

const labels: Record<TicketStatus, string> = {
  new: "New",
  diagnosing: "Diagnosing",
  waiting_approval: "Waiting Approval",
  waiting_parts: "Waiting Parts",
  repairing: "Repairing",
  testing: "Testing",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

const colors: Record<TicketStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  diagnosing: "bg-purple-100 text-purple-800",
  waiting_approval: "bg-amber-100 text-amber-900",
  waiting_parts: "bg-orange-100 text-orange-800",
  repairing: "bg-indigo-100 text-indigo-800",
  testing: "bg-cyan-100 text-cyan-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
