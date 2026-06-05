import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi, formatMoney, ticketsApi } from "@/lib/api";
import {
  Wrench,
  DollarSign,
  Clock,
  PackageCheck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { STATUS_CONFIG } from "@/types/commerce";

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
  });

  const { data: tickets } = useQuery({
    queryKey: ["tickets-dashboard"],
    queryFn: () => ticketsApi.list(1, 10),
  });

  const statusCounts = tickets?.items.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const activeStatuses = [
    "new", "booked", "travelling", "collected",
    "diagnosing", "awaiting_approval", "awaiting_parts",
    "repairing", "testing", "ready_for_return",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Sunset Country Repairs — Today's overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? "—" : summary?.repairs_in_progress ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? "—" : formatMoney(summary?.revenue_today ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready For Return</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {statusCounts["ready_for_return"] ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {statusCounts["awaiting_approval"] ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Repair Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeStatuses.map((status) => {
              const config = STATUS_CONFIG[status];
              const count = statusCounts[status] || 0;
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  {count > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-xs font-bold">
                      {count}
                    </span>
                  ) : null}
                  {config.label}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Repairs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0">
          {tickets?.items.slice(0, 8).map((t) => {
            const config = STATUS_CONFIG[t.status] || STATUS_CONFIG["new"];
            return (
              <div
                key={t.id}
                className="flex items-center justify-between border-b px-6 py-3"
              >
                <div>
                  <p className="font-medium">{t.ticket_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.customer_name || "Unknown"} · {t.issue_description?.slice(0, 40)}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
          {(!tickets?.items || tickets.items.length === 0) && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No repairs yet. Create your first repair ticket to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
