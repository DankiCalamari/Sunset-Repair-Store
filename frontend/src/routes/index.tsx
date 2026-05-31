import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { setupApi } from "@/lib/api";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SetupPage } from "@/pages/setup/SetupPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { PortalTrackerPage } from "@/pages/portal/PortalTrackerPage";
import { InventoryPage } from "@/pages/inventory/InventoryPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { QuotesPage } from "@/pages/quotes/QuotesPage";
import { InvoicesPage } from "@/pages/invoices/InvoicesPage";
import { TicketsPage } from "@/pages/tickets/TicketsPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { PosPage } from "@/pages/pos/PosPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { AdminPage } from "@/pages/admin/AdminPage";

function SetupGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setupApi
      .status()
      .then(({ needs_setup }) => {
        if (needs_setup) navigate("/setup", { replace: true });
        else setChecked(true);
      })
      .catch(() => setChecked(true)); // if API is unreachable, let normal flow handle it
  }, [navigate]);

  if (!checked) return null;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/track" element={<PortalTrackerPage />} />
      <Route
        element={
          <SetupGate>
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          </SetupGate>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
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
