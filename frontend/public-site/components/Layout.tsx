import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, Wrench, X } from "lucide-react";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Book", to: "/book" },
  { label: "Service Area", to: "/service-area" },
  { label: "Track", to: "/track" },
  { label: "Portal", to: "/portal" },
  { label: "About", to: "/about" },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-orange-50/40">
      <header className="sticky top-0 z-50 border-b border-orange-100/60 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 text-white shadow-lg shadow-orange-200">
              <Wrench className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-black tracking-tight text-stone-900 sm:text-lg">Sunset Country Repairs</span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">Mobile tech repair · Sunraysia</span>
            </span>
          </Link>

          <nav className="hidden items-center rounded-full border border-orange-100 bg-orange-50/60 p-1 lg:flex">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive ? "bg-white text-orange-700 shadow-sm" : "text-stone-600 hover:bg-white/70 hover:text-orange-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/book"
              className="hidden rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 sm:inline-flex"
            >
              Book Now
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-orange-100 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                      isActive ? "bg-orange-50 text-orange-700" : "text-stone-600 hover:bg-orange-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Link
              to="/book"
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-orange-600 py-3 text-sm font-bold text-white"
            >
              Book a Mobile Repair
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-orange-100 bg-stone-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-400">
                <Wrench className="h-5 w-5" />
              </span>
              <p className="text-lg font-black">Sunset Country Repairs</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-400">
              Professional mobile phone, tablet, laptop and technology repairs. We come to your home, workplace, farm, or business.
            </p>
          </div>
          <div>
            <p className="font-bold text-amber-300">Service areas</p>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Mildura · Irymple · Merbein · Red Cliffs · Nichols Point · Wentworth · Sunraysia Region
            </p>
          </div>
          <div>
            <p className="font-bold text-amber-300">Repair options</p>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Mobile call-outs · Pickup &amp; delivery · Business visits · Mail-in repairs · Scheduled appointments
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-stone-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Sunset Country Repairs. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
