import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold lg:hidden">Sunset Country Tech</h1>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
