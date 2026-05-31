import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customersApi, formatMoney, invoicesApi, quotesApi } from "@/lib/api";
import type { Invoice } from "@/types/commerce";
import { InvoiceStatusBadge } from "@/components/shared/CommerceBadges";

export function InvoicesPage() {
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.list(),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => customersApi.list(),
    enabled: showCreate,
  });

  const { data: approvedQuotes } = useQuery({
    queryKey: ["quotes-approved"],
    queryFn: () => quotesApi.list("approved"),
    enabled: showCreate,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    if (selected) invoicesApi.get(selected.id).then(setSelected);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (quoteId) {
        const quote = approvedQuotes?.items.find((q) => q.id === quoteId);
        return invoicesApi.create({
          customer_id: quote!.customer_id!,
          quote_id: quoteId,
        });
      }
      return invoicesApi.create({
        customer_id: customerId,
        lines: [{ description: "Repair service", quantity: 1, unit_price: 100 }],
      });
    },
    onSuccess: (inv) => {
      refresh();
      setSelected(inv);
      setShowCreate(false);
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      invoicesApi.pay(selected!.id, {
        amount: parseFloat(payAmount),
        method: payMethod,
      }),
    onSuccess: (inv) => {
      setSelected(inv);
      setShowPay(false);
      setPayAmount("");
      refresh();
    },
  });

  const balance = selected
    ? parseFloat(selected.total) - parseFloat(selected.amount_paid)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">Billing and payment tracking</p>
        </div>
        <Button variant="accent" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New invoice
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All invoices ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {isLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading…</p>}
            {data?.items.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelected(inv)}
                className={`flex w-full items-center justify-between border-b px-6 py-3 text-left hover:bg-muted/50 ${
                  selected?.id === inv.id ? "bg-muted" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.customer_name}
                    {inv.ticket_number ? ` · ${inv.ticket_number}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatMoney(inv.total)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          {selected ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selected.invoice_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.customer_name}</p>
                </div>
                <InvoiceStatusBadge status={selected.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2">{l.description}</td>
                        <td className="py-2 text-right">{l.quantity}</td>
                        <td className="py-2 text-right">{formatMoney(l.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMoney(selected.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST</span>
                    <span>{formatMoney(selected.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(selected.total)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Paid</span>
                    <span>{formatMoney(selected.amount_paid)}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Balance due</span>
                      <span>{formatMoney(balance)}</span>
                    </div>
                  )}
                </div>
                {selected.payments.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Payments</h3>
                    <ul className="space-y-1 text-sm">
                      {selected.payments.map((p) => (
                        <li key={p.id} className="flex justify-between rounded-md bg-muted px-3 py-1.5">
                          <span className="capitalize">{p.method.replace(/_/g, " ")}</span>
                          <span>{formatMoney(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {balance > 0 && selected.status !== "paid" && (
                  <Button size="sm" variant="accent" onClick={() => { setPayAmount(balance.toFixed(2)); setShowPay(true); }}>
                    <CreditCard className="mr-1 h-3 w-3" /> Record payment
                  </Button>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select an invoice to view details
            </CardContent>
          )}
        </Card>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">From approved quote</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={quoteId}
                  onChange={(e) => { setQuoteId(e.target.value); setCustomerId(""); }}
                >
                  <option value="">Select quote (recommended)…</option>
                  {approvedQuotes?.items.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} — {q.customer_name} ({formatMoney(q.total)})
                    </option>
                  ))}
                </select>
              </div>
              {!quoteId && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Or customer (manual)</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Select customer…</option>
                    {customers?.items.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  variant="accent"
                  disabled={(!quoteId && !customerId) || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPay && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Record payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                placeholder="Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPay(false)}>Cancel</Button>
                <Button variant="accent" disabled={!payAmount || payMutation.isPending} onClick={() => payMutation.mutate()}>
                  Save payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
