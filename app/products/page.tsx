"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Search,
  Trash2,
  Pencil,
  Plus,
  PackageCheck,
  PackageX,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Product } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/data-state";
import { formatCurrency } from "@/lib/utils";

const empty: Product = {
  sku: "",
  name: "",
  description: "",
  price: 0,
  costPrice: 0,
  stock: 0,
  taxable: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);

    try {
      setProducts(await api.products.list());
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load products"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.sku}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [products, search]
  );

  function startEdit(product: Product) {
    if (!product.id) return;

    setEditingId(product.id);

    setForm({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      price: Number(product.price || 0),
      costPrice: product.costPrice,
      stock: Number(product.stock || 0),
      taxable: product.taxable !== false,
      id: product.id,
    });

    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
    setError("");
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const data = {
        sku: form.sku,
        name: form.name,
        description: form.description || "",
        price: Number(form.price),
        costPrice: Number(form.costPrice),
        stock: Number(form.stock),
        taxable: Boolean(form.taxable),
      };

      if (editingId !== null) {
        const updated = await api.products.update(editingId, data);

        setProducts((current) =>
          current.map((product) =>
            product.id === editingId ? updated : product
          )
        );

        setEditingId(null);
        setForm(empty);
      } else {
        const created = await api.products.create(data);

        setProducts((current) => [created, ...current]);
        setForm(empty);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingId !== null
            ? "Could not update product"
            : "Could not create product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this product?")) return;

    try {
      await api.products.remove(id);

      setProducts((current) =>
        current.filter((product) => product.id !== id)
      );

      if (editingId === id) {
        cancelEdit();
      }

      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete product"
      );
    }
  }

  if (loading) {
    return <LoadingState label="Loading product catalogue…" />;
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Keep your SKU catalogue, pricing and stock levels in sync with the Spring Boot API."
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_350px]">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                className="input pl-10"
                placeholder="Search by product name or SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="text-sm font-bold text-slate-500">
              {filtered.length} of {products.length} products
            </div>
          </div>

          <div className="hidden grid-cols-[1.4fr_.8fr_.7fr_.7fr_80px] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 md:grid">
            <div>Product</div>
            <div>SKU</div>
            <div>Price</div>
            <div>Stock</div>
            <div />
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="grid gap-3 p-5 md:grid-cols-[1.4fr_.8fr_.7fr_.7fr_80px] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Boxes size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-bold">{p.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {p.description || "No description"}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  {p.sku || "—"}
                </div>

                <div className="font-black">
                  {formatCurrency(p.price)}
                </div>

                <div
                  className={
                    Number(p.stock) <= 5
                      ? "font-black text-amber-600"
                      : "font-bold text-slate-700"
                  }
                >
                  {p.stock}
                </div>

                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="btn btn-ghost !p-2 text-blue-500 hover:bg-blue-50"
                    aria-label={`Edit ${p.name}`}
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => p.id && remove(p.id)}
                    className="btn btn-ghost !p-2 text-rose-500 hover:bg-rose-50"
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}

            {!filtered.length && (
              <div className="p-12 text-center text-sm text-slate-400">
                No products match your search.
              </div>
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-10 place-items-center rounded-xl ${
                editingId !== null
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 text-white"
              }`}
            >
              {editingId !== null ? (
                <Pencil size={18} />
              ) : (
                <Plus size={19} />
              )}
            </div>

            <div>
              <h2 className="font-black">
                {editingId !== null ? "Edit product" : "Add product"}
              </h2>

              <p className="text-xs text-slate-500">
                {editingId !== null
                  ? "Update product details."
                  : "Create a catalogue item."}
              </p>
            </div>
          </div>

          <form onSubmit={saveProduct} className="mt-5 space-y-4">
            <label className="block text-sm font-bold">
              Product name

              <input
                className="input mt-1.5"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-bold">
              SKU

              <input
                className="input mt-1.5"
                required
                value={form.sku}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sku: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-bold">
              Description

              <input
                className="input mt-1.5"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold">
                Price

                <input
                  className="input mt-1.5"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label className="block text-sm font-bold">
                Stock

                <input
                  className="input mt-1.5"
                  type="number"
                  min="0"
                  required
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={Boolean(form.taxable)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    taxable: e.target.checked,
                  })
                }
              />

              Taxable item
            </label>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId !== null
                    ? "Update product"
                    : "Save product"}
              </Button>

              {editingId !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <PackageCheck
                size={17}
                className="text-emerald-600"
              />

              <div className="mt-2 text-xs text-slate-500">
                Healthy stock
              </div>

              <div className="font-black">
                {products.filter(
                  (p) => Number(p.stock) > 5
                ).length}
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-3">
              <PackageX
                size={17}
                className="text-amber-600"
              />

              <div className="mt-2 text-xs text-slate-500">
                Low stock
              </div>

              <div className="font-black">
                {products.filter(
                  (p) => Number(p.stock) <= 5
                ).length}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
