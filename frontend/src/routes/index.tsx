import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { PortalTrackerPage } from "@/pages/portal/PortalTrackerPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { QuotesPage } from "@/pages/quotes/QuotesPage";
import { InvoicesPage } from "@/pages/invoices/InvoicesPage";
import { TicketsPage } from "@/pages/tickets/TicketsPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { PosPage } from "@/pages/pos/PosPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { AdminPage } from "@/pages/admin/AdminPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/track" element={<PortalTrackerPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
