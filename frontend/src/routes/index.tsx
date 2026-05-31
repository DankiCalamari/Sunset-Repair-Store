import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { setupApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SetupPage } from "@/pages/setup/SetupPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { TicketsPage } from "@/pages/tickets/TicketsPage";
import { InventoryPage } from "@/pages/inventory/InventoryPage";
import { QuotesPage } from "@/pages/quotes/QuotesPage";
import { InvoicesPage } from "@/pages/invoices/InvoicesPage";
import { AppointmentsPage } from "@/pages/appointments/AppointmentsPage";
import { PosPage } from "@/pages/pos/PosPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { PortalTrackerPage } from "@/pages/portal/PortalTrackerPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return user ? <>{children}</> : null;
}

function SetupGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await setupApi.status();
        if (response.needs_setup) {
          navigate("/setup", { replace: true });
        } else {
          setChecked(true);
        }
      } catch (error) {
        console.error("Failed to check setup status:", error);
        setError("Failed to check setup status. Please try again later.");
        navigate("/login", { replace: true });
      }
    };

    const hasSetupCompleted = localStorage.getItem("setup_completed");
    if (hasSetupCompleted === "true") {
      setChecked(true);
    } else {
      checkSetupStatus();
    }
  }, [navigate]);

  if (error) return <div>{error}</div>;

  return checked ? <>{children}</> : null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/:ticketId" element={<PortalTrackerPage />} />
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
