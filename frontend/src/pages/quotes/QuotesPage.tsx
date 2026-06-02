import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, FileDown, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, quotesApi, ticketsApi } from "@/lib/api";
import type { Quote } from "@/types/commerce";
import { QuoteStatusBadge } from "@/components/shared/CommerceBadges";

export function QuotesPage() {
  const [selected, setSelected] = useState<Quote | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [lines, setLines] = useState([
    { line_type: "labour", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => quotesApi.list(),
  });

  const { data: tickets } = useQuery({
    queryKey: ["tickets-for-quotes"],
    queryFn: () => ticketsApi.list(),
    enabled: showCreate,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["quotes"] });
    if (selected) quotesApi.get(selected.id).then(setSelected);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      quotesApi.create({
        ticket_id: ticketId,
        lines: lines.filter((l) => l.description && l.unit_price >= 0),
      }),
    onSuccess: (q) => {
      refresh();
      setSelected(q);
      setShowCreate(false);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: "send" | "approve" | "reject"; id: string }) => {
      if (action === "send") return quotesApi.send(id);
      if (action === "approve") return quotesApi.approve(id);
      return quotesApi.reject(id);
    },
    onSuccess: (q) => {
      setSelected(q);
      refresh();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quotations</h2>
          <p className="text-muted-foreground">Create and manage repair quotes</p>
        </div>
        <Button variant="accent" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New quote
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All quotes ({data?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            {isLoading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading…</p>}
            {data?.items.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelected(q)}
                className={`flex w-full items-center justify-between border-b px-6 py-3 text-left hover:bg-muted/50 ${
                  selected?.id === q.id ? "bg-muted" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{q.quote_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.customer_name} · {q.ticket_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatMoney(q.total)}</span>
                  <QuoteStatusBadge status={q.status} />
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
                  <CardTitle>{selected.quote_number}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selected.customer_name} · Ticket {selected.ticket_number}
                  </p>
                </div>
                <QuoteStatusBadge status={selected.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2">Item</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2">
                          <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs capitalize">{l.line_type}</span>
                          {l.description}
                        </td>
                        <td className="py-2 text-right">{l.quantity}</td>
                        <td className="py-2 text-right">{formatMoney(l.unit_price)}</td>
                        <td className="py-2 text-right">
                          {formatMoney(parseFloat(l.quantity) * parseFloat(l.unit_price))}
                        </td>
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
                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatMoney(selected.total)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadingPdf}
                    onClick={async () => {
                      setDownloadingPdf(true);
                      try {
                        await quotesApi.downloadPdf(selected.id, `${selected.quote_number}.pdf`);
                      } finally {
                        setDownloadingPdf(false);
                      }
                    }}
                  >
                    <FileDown className="mr-1 h-3 w-3" />
                    {downloadingPdf ? "Generating..." : "Download PDF"}
                  </Button>
                  {selected.status === "draft" && (
                    <Button size="sm" onClick={() => actionMutation.mutate({ action: "send", id: selected.id })}>
                      <Send className="mr-1 h-3 w-3" /> Send to customer
                    </Button>
                  )}
                  {(selected.status === "sent" || selected.status === "draft") && (
                    <>
                      <Button size="sm" variant="accent" onClick={() => actionMutation.mutate({ action: "approve", id: selected.id })}>
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ action: "reject", id: selected.id })}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a quote to view details
            </CardContent>
          )}
        </Card>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader>
              <CardTitle>New quotation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Repair ticket</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                >
                  <option value="">Select ticket…</option>
                  {tickets?.items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticket_number} — {t.issue_description.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select
                    className="col-span-2 rounded-md border px-2 text-xs"
                    value={line.line_type}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].line_type = e.target.value;
                      setLines(next);
                    }}
                  >
                    <option value="labour">Labour</option>
                    <option value="parts">Parts</option>
                  </select>
                  <Input
                    className="col-span-5"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].description = e.target.value;
                      setLines(next);
                    }}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].quantity = parseFloat(e.target.value) || 1;
                      setLines(next);
                    }}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Price"
                    value={line.unit_price || ""}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i].unit_price = parseFloat(e.target.value) || 0;
                      setLines(next);
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines([...lines, { line_type: "parts", description: "", quantity: 1, unit_price: 0 }])
                }
              >
                + Add line
              </Button>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  variant="accent"
                  disabled={!ticketId || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
