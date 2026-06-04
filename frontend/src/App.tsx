import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

const queryClient = new QueryClient();

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
  const fetchSettings = useSettings((s) => s.fetchSettings);
  useEffect(() => {
    hydrate();
    fetchSettings();
  }, [hydrate, fetchSettings]);
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <AppRoutes />
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
