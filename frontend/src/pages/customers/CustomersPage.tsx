import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customersApi, formatMoney } from "@/lib/api";
import type { Customer } from "@/types/commerce";
import { QuoteStatusBadge, InvoiceStatusBadge } from "@/components/shared/CommerceBadges";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", city: "", notes: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => customersApi.list(query),
  });

  const createMutation = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", city: "", notes: "" });
    },
  });

  const { data: repairs } = useQuery({
    queryKey: ["customer-repairs", selected?.id],
    queryFn: () => customersApi.repairs(selected!.id),
    enabled: !!selected,
  });

  const { data: quotes } = useQuery({
    queryKey: ["customer-quotes", selected?.id],
    queryFn: () => customersApi.quotes(selected!.id),
    enabled: !!selected,
  });

  const { data: invoices } = useQuery({
    queryKey: ["customer-invoices", selected?.id],
    queryFn: () => customersApi.invoices(selected!.id),
    enabled: !!selected,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-muted-foreground">Manage customer records and history</p>
        </div>
        <Button variant="accent" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add customer
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
          />
        </div>
        <Button variant="outline" onClick={() => setQuery(search)}>
          Search
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>All customers ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {isLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading…</p>}
            {data?.items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={`flex w-full items-start gap-3 border-b border-border px-6 py-3 text-left transition-colors hover:bg-muted/50 ${
                  selected?.id === c.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{c.first_name} {c.last_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.phone || c.email}</p>
                </div>
              </button>
            ))}
            {!isLoading && data?.items.length === 0 && (
              <p className="px-6 pb-4 text-sm text-muted-foreground">No customers found</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader>
                <CardTitle>{selected.first_name} {selected.last_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {[selected.phone, selected.email, selected.city].filter(Boolean).join(" · ")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {selected.notes && (
                  <p className="rounded-md bg-muted p-3 text-sm">{selected.notes}</p>
                )}
                <section>
                  <h3 className="mb-2 font-semibold">Repair history</h3>
                  {repairs?.length ? (
                    <ul className="space-y-1 text-sm">
                      {repairs.map((t) => (
                        <li key={t.id} className="flex justify-between rounded-md border px-3 py-2">
                          <span>{t.ticket_number}</span>
                          <span className="capitalize text-muted-foreground">{t.status.replace(/_/g, " ")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No repairs</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 font-semibold">Quotes</h3>
                  {quotes?.length ? (
                    <ul className="space-y-1 text-sm">
                      {quotes.map((q) => (
                        <li key={q.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span>{q.quote_number}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatMoney(q.total)}</span>
                            <QuoteStatusBadge status={q.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quotes</p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 font-semibold">Invoices</h3>
                  {invoices?.length ? (
                    <ul className="space-y-1 text-sm">
                      {invoices.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span>{inv.invoice_number}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatMoney(inv.total)}</span>
                            <InvoiceStatusBadge status={inv.status} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No invoices</p>
                  )}
                </section>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a customer to view details and history
            </CardContent>
          )}
        </Card>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                <Input placeholder="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="accent" disabled={!form.first_name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
