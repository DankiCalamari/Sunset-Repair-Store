import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, inventoryApi, posApi } from "@/lib/api";
import type { InventoryItem, PosSale } from "@/types/commerce";

type CartLine = { item: InventoryItem; quantity: number };

export function PosPage() {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-items", q],
    queryFn: () => inventoryApi.list(q),
  });

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + parseFloat(line.item.unit_price) * line.quantity, 0);
    const tax = subtotal * 0.1;
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  const addItem = (item: InventoryItem) => {
    setCart((lines) => {
      const existing = lines.find((line) => line.item.id === item.id);
      if (existing) {
        return lines.map((line) =>
          line.item.id === item.id ? { ...line, quantity: Math.min(line.quantity + 1, item.quantity_on_hand) } : line
        );
      }
      return [...lines, { item, quantity: 1 }];
    });
  };

  const checkoutMutation = useMutation({
    mutationFn: () =>
      posApi.createSale({
        payment_method: paymentMethod,
        lines: cart.map((line) => ({ inventory_item_id: line.item.id, quantity: line.quantity })),
      }),
    onSuccess: (sale) => {
      setLastSale(sale);
      setCart([]);
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">POS</h2>
          <p className="text-muted-foreground">Counter sales for stocked items</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Search by name, SKU, or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
            {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {data?.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.quantity_on_hand <= 0}
                  onClick={() => addItem(item)}
                  className="rounded-md border border-border p-4 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <p className="font-semibold">{formatMoney(item.unit_price)}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.quantity_on_hand} in stock</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 && <p className="text-sm text-muted-foreground">Add items to start a sale.</p>}
            {cart.map((line) => (
              <div key={line.item.id} className="flex items-center justify-between gap-3 border-b pb-3">
                <div>
                  <p className="font-medium">{line.item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatMoney(line.item.unit_price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={() =>
                      setCart((lines) =>
                        lines
                          .map((l) => (l.item.id === line.item.id ? { ...l, quantity: l.quantity - 1 } : l))
                          .filter((l) => l.quantity > 0)
                      )
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button className="h-9 w-9 p-0" variant="outline" onClick={() => addItem(line.item)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatMoney(totals.tax)}</span></div>
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
            <Button
              className="w-full"
              variant="accent"
              disabled={cart.length === 0 || checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Checkout
            </Button>
          </CardContent>
        </Card>
        {lastSale && (
          <Card>
            <CardHeader>
              <CardTitle>{lastSale.sale_number}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-semibold">{formatMoney(lastSale.total)} paid by {lastSale.payment_method.replace(/_/g, " ")}</p>
              <p className="text-muted-foreground">{lastSale.lines.length} line item(s)</p>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
