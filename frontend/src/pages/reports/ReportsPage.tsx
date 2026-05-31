import { useQuery } from "@tanstack/react-query";
import { BarChart3, Package, Receipt, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, reportsApi } from "@/lib/api";

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof BarChart3;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const { data: revenue } = useQuery({ queryKey: ["reports-revenue"], queryFn: reportsApi.revenue });
  const { data: technicians } = useQuery({ queryKey: ["reports-technicians"], queryFn: reportsApi.technicians });
  const { data: repairs } = useQuery({ queryKey: ["reports-repairs"], queryFn: reportsApi.commonRepairs });
  const { data: inventory } = useQuery({ queryKey: ["reports-inventory"], queryFn: reportsApi.inventory });
  const { data: warranty } = useQuery({ queryKey: ["reports-warranty"], queryFn: reportsApi.warranty });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground">Revenue, workload, stock, and warranty snapshots</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total revenue"
          value={formatMoney(revenue?.total_revenue ?? 0)}
          detail={`${revenue?.invoice_count ?? 0} invoices · ${revenue?.pos_sale_count ?? 0} POS sales`}
          icon={Receipt}
        />
        <MetricCard
          title="Payments collected"
          value={formatMoney(revenue?.payments_collected ?? 0)}
          detail="Last 30 days"
          icon={BarChart3}
        />
        <MetricCard
          title="Low stock"
          value={inventory?.low_stock_items ?? 0}
          detail={`${inventory?.active_items ?? 0} active items`}
          icon={Package}
        />
        <MetricCard
          title="Warranty claims"
          value={warranty?.open_claims ?? 0}
          detail={`${warranty?.expiring_soon ?? 0} expiring soon`}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Technician workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {technicians?.length === 0 && <p className="text-sm text-muted-foreground">No ticket workload yet.</p>}
            {technicians?.map((row) => (
              <div key={row.technician_id ?? "unassigned"} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{row.technician_name}</p>
                  <p className="text-sm text-muted-foreground">{row.completed_tickets} completed</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{row.open_tickets} open</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common repairs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {repairs?.length === 0 && <p className="text-sm text-muted-foreground">No repair history yet.</p>}
            {repairs?.map((row) => (
              <div key={row.issue_description} className="flex items-start justify-between gap-4 border-b pb-3">
                <div className="flex gap-3">
                  <Wrench className="mt-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{row.issue_description}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory valuation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Stock value at cost</p>
            <p className="text-xl font-bold">{formatMoney(inventory?.stock_value ?? 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Active items</p>
            <p className="text-xl font-bold">{inventory?.active_items ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Low stock items</p>
            <p className="text-xl font-bold">{inventory?.low_stock_items ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
