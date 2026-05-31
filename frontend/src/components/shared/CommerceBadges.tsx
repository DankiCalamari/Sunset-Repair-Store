import { cn } from "@/lib/utils";

const quoteLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

const quoteColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

const invoiceLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  void: "Void",
  refunded: "Refunded",
};

const invoiceColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-800",
  partial: "bg-amber-100 text-amber-900",
  paid: "bg-green-100 text-green-800",
  void: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

export function QuoteStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        quoteColors[status] || "bg-muted text-muted-foreground"
      )}
    >
      {quoteLabels[status] || status}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        invoiceColors[status] || "bg-muted text-muted-foreground"
      )}
    >
      {invoiceLabels[status] || status}
    </span>
  );
}
