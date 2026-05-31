import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Package,
  Plus,
  Search,
  Tag,
  Truck,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, inventoryApi } from "@/lib/api";
import type {
  InventoryCategory,
  InventoryItem,
  Supplier,
} from "@/types/commerce";

// ─── Tab type ────────────────────────────────────────────────────────────────
type Tab = "items" | "low-stock" | "categories" | "suppliers" | "purchase-orders";

// ─── Item Form Modal ─────────────────────────────────────────────────────────
function ItemFormModal({
  item,
  categories,
  onClose,
}: {
  item?: InventoryItem;
  categories: InventoryCategory[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    barcode: item?.barcode ?? "",
    category_id: item?.category_id ?? "",
    unit_cost: item ? parseFloat(item.unit_cost) : 0,
    unit_price: item ? parseFloat(item.unit_price) : 0,
    quantity_on_hand: item?.quantity_on_hand ?? 0,
    reorder_level: item?.reorder_level ?? 5,
  });

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? inventoryApi.update(item!.id, {
            name: form.name,
            description: form.description || null,
            barcode: form.barcode || null,
            category_id: form.category_id || null,
            unit_cost: form.unit_cost,
            unit_price: form.unit_price,
            reorder_level: form.reorder_level,
          })
        : inventoryApi.create({
            sku: form.sku,
            name: form.name,
            description: form.description || undefined,
            barcode: form.barcode || undefined,
            category_id: form.category_id || undefined,
            unit_cost: form.unit_cost,
            unit_price: form.unit_price,
            quantity_on_hand: form.quantity_on_hand,
            reorder_level: form.reorder_level,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      onClose();
    },
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit item" : "New item"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isEdit && (
            <Input placeholder="SKU *" value={form.sku} onChange={f("sku")} />
          )}
          <Input placeholder="Name *" value={form.name} onChange={f("name")} />
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={f("description")}
          />
          <Input placeholder="Barcode" value={form.barcode} onChange={f("barcode")} />
          <select
            className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={form.category_id}
            onChange={f("category_id")}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cost price</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(e) => setForm((p) => ({ ...p, unit_cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sell price *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Opening stock</label>
              <Input
                type="number"
                min="0"
                value={form.quantity_on_hand}
                onChange={(e) => setForm((p) => ({ ...p, quantity_on_hand: parseInt(e.target.value) || 0 }))}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Reorder level</label>
            <Input
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(e) => setForm((p) => ({ ...p, reorder_level: parseInt(e.target.value) || 0 }))}
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="accent"
              disabled={!form.name || (!isEdit && !form.sku) || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {isEdit ? "Save changes" : "Create item"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stock Adjust Modal ───────────────────────────────────────────────────────
function AdjustModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState(0);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => inventoryApi.adjust(item.id, qty, notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Adjust stock — {item.name}</CardTitle>
          <p className="text-sm text-muted-foreground">Current: {item.quantity_on_hand} units</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Quantity change (positive to add, negative to remove)
            </label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            />
          </div>
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {mutation.isError && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="accent"
              disabled={qty === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Apply adjustment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────
function ItemsTab({ lowStockOnly = false }: { lowStockOnly?: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => inventoryApi.categories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-items", query, categoryFilter, lowStockOnly],
    queryFn: () => inventoryApi.list(query, 1, lowStockOnly, categoryFilter || undefined),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-items"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, SKU, barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setQuery(search)}
            />
          </div>
          <Button variant="outline" onClick={() => setQuery(search)}>Search</Button>
          <select
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button variant="accent" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && data?.items.length === 0 && (
            <p className="px-6 py-4 text-sm text-muted-foreground">No items found.</p>
          )}
          <div className="divide-y divide-border">
            {data?.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.quantity_on_hand <= item.reorder_level && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Low stock
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                    {item.barcode ? ` · Barcode: ${item.barcode}` : ""}
                    {item.category_id
                      ? ` · ${categories.find((c) => c.id === item.category_id)?.name ?? ""}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(item.unit_price)}</p>
                    <p className="text-xs text-muted-foreground">Cost: {formatMoney(item.unit_cost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.quantity_on_hand}</p>
                    <p className="text-xs text-muted-foreground">Reorder @ {item.reorder_level}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setAdjustItem(item)}>
                      Adjust
                    </Button>
                    <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setEditItem(item)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Deactivate "${item.name}"?`)) deactivateMutation.mutate(item.id);
                      }}
                    >
                      Deactivate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(showForm || editItem) && (
        <ItemFormModal
          item={editItem ?? undefined}
          categories={categories}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
      {adjustItem && (
        <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />
      )}
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<InventoryCategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => inventoryApi.categories(),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createCategory(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-categories"] });
      setShowForm(false);
      setForm({ name: "", slug: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => inventoryApi.updateCategory(editCat!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-categories"] });
      setEditCat(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });

  const openEdit = (cat: InventoryCategory) => {
    setEditCat(cat);
    setForm({ name: cat.name, slug: cat.slug });
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="accent" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && categories.length === 0 && (
            <p className="px-6 py-4 text-sm text-muted-foreground">No categories yet.</p>
          )}
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => openEdit(cat)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(showForm || editCat) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{editCat ? "Edit category" : "New category"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Name *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: editCat ? p.slug : autoSlug(e.target.value) }))}
              />
              <Input
                placeholder="Slug *"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditCat(null); }}>Cancel</Button>
                <Button
                  variant="accent"
                  disabled={!form.name || !form.slug || createMutation.isPending || updateMutation.isPending}
                  onClick={() => editCat ? updateMutation.mutate() : createMutation.mutate()}
                >
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

// ─── Suppliers Tab ────────────────────────────────────────────────────────────
function SuppliersTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact_name: "", email: "", phone: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-suppliers"],
    queryFn: () => inventoryApi.suppliers(),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createSupplier(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      setShowForm(false);
      setForm({ name: "", contact_name: "", email: "", phone: "", notes: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => inventoryApi.updateSupplier(editSupplier!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-suppliers"] });
      setEditSupplier(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory-suppliers"] }),
  });

  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ name: s.name, contact_name: s.contact_name ?? "", email: s.email ?? "", phone: s.phone ?? "", notes: s.notes ?? "" });
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="accent" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add supplier
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && data?.items.length === 0 && (
            <p className="px-6 py-4 text-sm text-muted-foreground">No suppliers yet.</p>
          )}
          <div className="divide-y divide-border">
            {data?.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.contact_name, s.phone, s.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => openEdit(s)}>Edit</Button>
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(showForm || editSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editSupplier ? "Edit supplier" : "New supplier"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Name *" value={form.name} onChange={f("name")} />
              <Input placeholder="Contact name" value={form.contact_name} onChange={f("contact_name")} />
              <Input placeholder="Email" type="email" value={form.email} onChange={f("email")} />
              <Input placeholder="Phone" value={form.phone} onChange={f("phone")} />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                placeholder="Notes"
                value={form.notes}
                onChange={f("notes")}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditSupplier(null); }}>Cancel</Button>
                <Button
                  variant="accent"
                  disabled={!form.name || createMutation.isPending || updateMutation.isPending}
                  onClick={() => editSupplier ? updateMutation.mutate() : createMutation.mutate()}
                >
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

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────
function PurchaseOrdersTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPo, setSelectedPo] = useState<string | null>(null);
  const [poForm, setPoForm] = useState({
    supplier_id: "",
    notes: "",
    lines: [{ inventory_item_id: "", quantity_ordered: 1, unit_cost: 0 }],
  });

  const { data: suppliers } = useQuery({
    queryKey: ["inventory-suppliers"],
    queryFn: () => inventoryApi.suppliers(),
  });

  const { data: items } = useQuery({
    queryKey: ["inventory-items", "", "", false],
    queryFn: () => inventoryApi.list("", 1, false),
  });

  const { data: pos, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => inventoryApi.purchaseOrders(),
  });

  const { data: poDetail } = useQuery({
    queryKey: ["purchase-order", selectedPo],
    queryFn: () => inventoryApi.getPurchaseOrder(selectedPo!),
    enabled: !!selectedPo,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createPurchaseOrder({
        supplier_id: poForm.supplier_id,
        notes: poForm.notes || undefined,
        lines: poForm.lines.map((l) => ({
          inventory_item_id: l.inventory_item_id,
          quantity_ordered: l.quantity_ordered,
          unit_cost: l.unit_cost,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowCreate(false);
      setPoForm({ supplier_id: "", notes: "", lines: [{ inventory_item_id: "", quantity_ordered: 1, unit_cost: 0 }] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.submitPurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const receiveMutation = useMutation({
    mutationFn: (poId: string) =>
      inventoryApi.receivePurchaseOrder(
        poId,
        Object.entries(receiveQtys).map(([line_id, quantity_received]) => ({ line_id, quantity_received }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["purchase-order", selectedPo] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      setReceiveQtys({});
    },
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      ordered: "bg-blue-100 text-blue-700",
      partial: "bg-yellow-100 text-yellow-700",
      received: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-muted"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="accent" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading && <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && pos?.items.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">No purchase orders yet.</p>
            )}
            <div className="divide-y divide-border">
              {pos?.items.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => setSelectedPo(po.id)}
                  className={`flex w-full items-center justify-between px-6 py-3 text-left hover:bg-muted/50 ${selectedPo === po.id ? "bg-muted" : ""}`}
                >
                  <div>
                    <p className="font-medium">{po.po_number}</p>
                    <p className="text-xs text-muted-foreground">{po.supplier_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(po.status)}
                    <span className="text-xs text-muted-foreground">
                      {po.lines.length} line{po.lines.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {poDetail ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{poDetail.po_number}</CardTitle>
                {statusBadge(poDetail.status)}
              </div>
              <p className="text-sm text-muted-foreground">{poDetail.supplier_name}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {poDetail.lines.map((ln) => (
                  <div key={ln.id} className="rounded-md border border-border p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{ln.item_name}</p>
                      <p className="text-sm">{formatMoney(ln.unit_cost)} each</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ordered: {ln.quantity_ordered} · Received: {ln.quantity_received}
                    </p>
                    {(poDetail.status === "ordered" || poDetail.status === "partial") && (
                      <div className="mt-2">
                        <label className="text-xs text-muted-foreground">Receive qty</label>
                        <Input
                          type="number"
                          min="0"
                          max={ln.quantity_ordered - ln.quantity_received}
                          className="mt-1 h-8"
                          value={receiveQtys[ln.id] ?? 0}
                          onChange={(e) =>
                            setReceiveQtys((p) => ({ ...p, [ln.id]: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {poDetail.notes && (
                <p className="rounded-md bg-muted p-3 text-sm">{poDetail.notes}</p>
              )}
              <div className="flex gap-2">
                {poDetail.status === "draft" && (
                  <Button
                    variant="accent"
                    className="flex-1"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate(poDetail.id)}
                  >
                    Submit order
                  </Button>
                )}
                {(poDetail.status === "ordered" || poDetail.status === "partial") && (
                  <Button
                    variant="accent"
                    className="flex-1"
                    disabled={receiveMutation.isPending}
                    onClick={() => receiveMutation.mutate(poDetail.id)}
                  >
                    Record receipt
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a purchase order to view details
            </CardContent>
          </Card>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>New purchase order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={poForm.supplier_id}
                onChange={(e) => setPoForm((p) => ({ ...p, supplier_id: e.target.value }))}
              >
                <option value="">Select supplier *</option>
                {suppliers?.items.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Input
                placeholder="Notes"
                value={poForm.notes}
                onChange={(e) => setPoForm((p) => ({ ...p, notes: e.target.value }))}
              />
              <p className="text-sm font-medium">Lines</p>
              {poForm.lines.map((ln, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 items-end">
                  <select
                    className="flex h-10 rounded-md border border-border bg-card px-3 text-sm"
                    value={ln.inventory_item_id}
                    onChange={(e) =>
                      setPoForm((p) => ({
                        ...p,
                        lines: p.lines.map((l, j) => j === i ? { ...l, inventory_item_id: e.target.value } : l),
                      }))
                    }
                  >
                    <option value="">Item *</option>
                    {items?.items.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={ln.quantity_ordered}
                    onChange={(e) =>
                      setPoForm((p) => ({
                        ...p,
                        lines: p.lines.map((l, j) => j === i ? { ...l, quantity_ordered: parseInt(e.target.value) || 1 } : l),
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cost"
                    value={ln.unit_cost}
                    onChange={(e) =>
                      setPoForm((p) => ({
                        ...p,
                        lines: p.lines.map((l, j) => j === i ? { ...l, unit_cost: parseFloat(e.target.value) || 0 } : l),
                      }))
                    }
                  />
                  <Button
                    variant="outline"
                    className="h-10 w-8 p-0 text-destructive"
                    disabled={poForm.lines.length === 1}
                    onClick={() => setPoForm((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPoForm((p) => ({ ...p, lines: [...p.lines, { inventory_item_id: "", quantity_ordered: 1, unit_cost: 0 }] }))}
              >
                + Add line
              </Button>
              {createMutation.isError && (
                <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  variant="accent"
                  disabled={!poForm.supplier_id || poForm.lines.some((l) => !l.inventory_item_id) || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  Create PO
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function InventoryPage() {
  const [tab, setTab] = useState<Tab>("items");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "items", label: "Items", icon: Package },
    { id: "low-stock", label: "Low stock", icon: TrendingDown },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "purchase-orders", label: "Purchase orders", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory</h2>
        <p className="text-muted-foreground">Manage stock, categories, suppliers, and purchase orders</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "items" && <ItemsTab />}
      {tab === "low-stock" && <ItemsTab lowStockOnly />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "suppliers" && <SuppliersTab />}
      {tab === "purchase-orders" && <PurchaseOrdersTab />}
    </div>
  );
}
