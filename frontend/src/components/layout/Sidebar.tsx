import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  FileText,
  Receipt,
  Calendar,
  ShoppingCart,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/tickets", icon: Wrench, label: "Tickets" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/quotes", icon: FileText, label: "Quotes" },
  { to: "/invoices", icon: Receipt, label: "Invoices" },
  { to: "/appointments", icon: Calendar, label: "Appointments" },
  { to: "/pos", icon: ShoppingCart, label: "POS" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/admin", icon: Settings, label: "Admin" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="h-8 w-8 rounded-lg bg-accent" />
        <div>
          <p className="text-sm font-bold leading-tight">Repair Shop</p>
          <p className="text-xs text-muted-foreground">ERP</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
