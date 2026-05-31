import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardApi } from "@/lib/api";
import { Wrench, DollarSign, Clock, PackageCheck } from "lucide-react";

const kpis = [
  { key: "repairs_today" as const, label: "Repairs Today", icon: Wrench },
  { key: "revenue_today" as const, label: "Revenue Today", icon: DollarSign, format: (v: number) => `$${v.toFixed(2)}` },
  { key: "repairs_in_progress" as const, label: "In Progress", icon: Clock },
  { key: "devices_waiting_pickup" as const, label: "Awaiting Pickup", icon: PackageCheck },
];

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Today&apos;s shop overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ key, label, icon: Icon, format }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {isLoading
                  ? "—"
                  : format
                    ? format(data?.[key] ?? 0)
                    : data?.[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.low_stock_count ? (
              <p className="text-sm">{data.low_stock_count} items below reorder level</p>
            ) : (
              <p className="text-sm text-muted-foreground">No low stock alerts</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Connect WebSocket for live feed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
