import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "@/lib/auth/useAuth";
import setupApi from "@/services/setupService";

function SetupGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await setupApi.status();
        if (response.needs_setup) navigate("/setup", { replace: true });
        else setChecked(true);
      } catch (error) {
        console.error("Failed to check setup status:", error);
        setError("Failed to check setup status. Please try again later.");
        navigate("/login", { replace: true });
      }
    };

    checkSetupStatus();
  }, [navigate]);

  if (error) return <div>{error}</div>;

  return checked ? <>{children}</> : null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
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
