"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Product } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/data-state";
import { formatCurrency } from "@/lib/utils";

const PAGE_SIZE = 20;

function createEmptyProduct(): Product {
  return {
    sku: "",
    name: "",
    description: "",
    price: 0,
    costPrice: 0,
    stock: 0,
    taxable: true,
  };
}

function numericValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<Product>(() => createEmptyProduct());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const requestSequence = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (requestedPage: number, requestedSearch: string) => {
    const requestId = ++requestSequence.current;
    setLoading(true);

    try {
      const result = await api.products.list({
        page: requestedPage,
        limit: PAGE_SIZE,
        search: requestedSearch.trim(),
      });

      // Ignore older responses when the user types or changes pages quickly.
      if (requestId !== requestSequence.current) return;

      setProducts(result.products || []);
      setTotal(numericValue(result.total));
      setPage(Math.max(1, numericValue(result.page) || requestedPage));
      setTotalPages(Math.max(1, numericValue(result.totalPages) || 1));
      setError("");
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e instanceof Error ? e.message : "Could not load products.");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setHasLoaded(true);
      }
    }
  }, []);

  useEffect(() => {
    void load(1, "");

    return () => {
      requestSequence.current += 1;
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, [load]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);

    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }

    searchTimer.current = window.setTimeout(() => {
      void load(1, value);
    }, 300);
  }

  function clearSearch() {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setSearch("");
    setPage(1);
    void load(1, "");
  }

  function startEdit(product: Product) {
    if (!product.id) return;

    setEditingId(product.id);
    setForm({
      id: product.id,
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      price: numericValue(product.price),
      costPrice: numericValue(product.costPrice),
      stock: numericValue(product.stock),
      taxable: product.taxable !== false,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(createEmptyProduct());
    setError("");
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const sku = form.sku.trim();
    const price = Number(form.price);
    const costPrice = Number(form.costPrice);
    const stock = Number(form.stock);

    if (!name) {
      setError("Enter a product name.");
      return;
    }
    if (!sku) {
      setError("Enter a SKU for this product.");
      return;
    }
    if (![price, costPrice, stock].every(Number.isFinite) || price < 0 || costPrice < 0 || stock < 0) {
      setError("Selling price, purchase cost and stock must be valid non-negative numbers.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      sku,
      name,
      description: (form.description || "").trim(),
      price,
      costPrice,
      stock,
      taxable: Boolean(form.taxable),
    };

    try {
      if (editingId !== null) {
        await api.products.update(editingId, payload);
        setEditingId(null);
        setForm(createEmptyProduct());
        await load(page, search);
      } else {
        await api.products.create(payload);
        setForm(createEmptyProduct());
        setPage(1);
        await load(1, search);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingId !== null
            ? "Could not update product."
            : "Could not create product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: number) {
    const product = products.find((item) => item.id === id);
    const label = product?.name || "this product";
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return;

    setDeletingId(id);
    setError("");

    try {
      await api.products.remove(id);

      const nextPage = products.length === 1 && page > 1 ? page - 1 : page;
      if (editingId === id) cancelEdit();
      await load(nextPage, search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  const healthyOnPage = products.filter((product) => numericValue(product.stock) > 5).length;
  const lowOnPage = products.filter((product) => numericValue(product.stock) <= 5).length;
  const displayedStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const displayedEnd = Math.min((page - 1) * PAGE_SIZE + products.length, total);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage your product catalogue, purchase costs, selling prices and available stock."
        actionHref="/stock-in"
        actionLabel="Stock In"
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertCircle size={19} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-rose-800">Something needs your attention</p>
              <p className="mt-1 break-words text-sm text-rose-700">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 border border-rose-200 bg-white"
            onClick={() => void load(page, search)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Retry
          </Button>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="product-search"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Search catalogue
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="product-search"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="Search by product name or SKU..."
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  autoComplete="off"
                />
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear product search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 lg:pb-0.5">
              <p className="text-sm font-semibold text-slate-500">
                {loading && hasLoaded ? "Updating products…" : `${total.toLocaleString("en-IN")} product${total === 1 ? "" : "s"}`}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onClick={() => void load(page, search)}
                disabled={loading}
                aria-label="Refresh products"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(72px,.75fr)_minmax(95px,.85fr)_minmax(95px,.85fr)_minmax(65px,.55fr)_76px] gap-4 border-b border-slate-100 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 md:grid">
            <div>Product</div>
            <div>SKU</div>
            <div>Purchase cost</div>
            <div>Selling price</div>
            <div>Stock</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading && !hasLoaded ? (
              <div className="p-3 sm:p-4">
                <TableSkeleton rows={6} />
              </div>
            ) : products.length > 0 ? (
              products.map((product) => {
                const stock = numericValue(product.stock);
                const lowStock = stock <= 5;

                return (
                  <article
                    key={product.id}
                    className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 transition-colors hover:bg-slate-50/70 sm:grid-cols-3 md:grid-cols-[minmax(0,1.6fr)_minmax(72px,.75fr)_minmax(95px,.85fr)_minmax(95px,.85fr)_minmax(65px,.55fr)_76px] md:items-center md:gap-4 md:px-5"
                  >
                    <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-3 md:col-span-1">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                        <Boxes size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-extrabold leading-5 text-slate-900">
                          {product.name || "Unnamed product"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {product.description || "No description added"}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">SKU</p>
                      <p className="break-all text-xs font-semibold text-slate-600">{product.sku || "—"}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Purchase cost</p>
                      <p className="text-sm font-semibold tabular-nums text-slate-600">
                        {formatCurrency(numericValue(product.costPrice))}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Selling price</p>
                      <p className="text-sm font-extrabold tabular-nums text-slate-900">
                        {formatCurrency(numericValue(product.price))}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">Available stock</p>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                          lowStock
                            ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        }`}
                        title={lowStock ? "Stock is at or below 5 units" : "Stock level is above 5 units"}
                      >
                        {lowStock ? <PackageX size={13} /> : <PackageCheck size={13} />}
                        {stock.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-3 md:col-span-1 md:border-0 md:pt-0">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                        aria-label={`Edit ${product.name}`}
                        title="Edit product"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => product.id && void removeProduct(product.id)}
                        disabled={!product.id || deletingId === product.id}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete ${product.name}`}
                        title="Delete product"
                      >
                        {deletingId === product.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="px-5 py-14 text-center sm:py-16">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  {search ? <Search size={23} /> : <Boxes size={23} />}
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  {error ? "Products could not be loaded" : search ? "No matching products" : "Your catalogue is empty"}
                </h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
                  {error
                    ? "Check your connection and try again."
                    : search
                      ? "Try another product name or SKU, or clear your search."
                      : "Add your first product using the form to start building your catalogue."}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  {search ? (
                    <Button type="button" variant="secondary" onClick={clearSearch}>
                      <X size={15} />
                      Clear search
                    </Button>
                  ) : error ? (
                    <Button type="button" variant="secondary" onClick={() => void load(page, search)} disabled={loading}>
                      <RefreshCw size={15} />
                      Try again
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs font-medium text-slate-500">
              {total > 0 ? (
                <>Showing <span className="font-bold text-slate-700">{displayedStart}–{displayedEnd}</span> of <span className="font-bold text-slate-700">{total.toLocaleString("en-IN")}</span> products</>
              ) : (
                "No products to display"
              )}
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="mr-1 min-w-[82px] text-center text-xs font-bold text-slate-600">Page {page} of {totalPages}</span>
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1, search)}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1, search)}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          <div className={`p-5 ${editingId !== null ? "bg-blue-50/70" : "bg-slate-50/70"}`}>
            <div className="flex items-center gap-3">
              <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${editingId !== null ? "bg-blue-600 text-white" : "bg-slate-900 text-white"}`}>
                {editingId !== null ? <Pencil size={18} /> : <Plus size={20} />}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-900">
                  {editingId !== null ? "Edit product" : "Add a product"}
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {editingId !== null ? "Update the selected product's details." : "Add an item to your catalogue."}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={saveProduct} className="space-y-4 p-5">
            <label className="block text-sm font-bold text-slate-700">
              Product name <span className="text-rose-500">*</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Basmati Rice 1 kg"
                autoComplete="off"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              SKU / product code <span className="text-rose-500">*</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                required
                maxLength={80}
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder="e.g. RICE-001"
                autoComplete="off"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">Use a unique code that is easy to find.</span>
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                rows={2}
                maxLength={500}
                value={form.description || ""}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Brand, size or other details"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0 text-sm font-bold text-slate-700">
                Purchase cost <span className="text-rose-500">*</span>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-7 pr-2 text-sm font-semibold tabular-nums outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.costPrice ?? 0}
                    onChange={(event) => setForm({ ...form, costPrice: Number(event.target.value) })}
                  />
                </div>
              </label>
              <label className="block min-w-0 text-sm font-bold text-slate-700">
                Selling price <span className="text-rose-500">*</span>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-7 pr-2 text-sm font-semibold tabular-nums outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price ?? 0}
                    onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                  />
                </div>
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700">
              Available stock <span className="text-rose-500">*</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.stock ?? 0}
                onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })}
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">For a new product, you can start at 0 and record stock through Stock In.</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-slate-300 accent-blue-600"
                checked={Boolean(form.taxable)}
                onChange={(event) => setForm({ ...form, taxable: event.target.checked })}
              />
              <span>
                <span className="block text-sm font-bold text-slate-700">Taxable item</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">Enable this when the product should be treated as taxable.</span>
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={saving}>
                {saving ? (
                  <><RefreshCw size={16} className="animate-spin" /> Saving…</>
                ) : editingId !== null ? (
                  <><Check size={16} /> Update product</>
                ) : (
                  <><Plus size={17} /> Save product</>
                )}
              </Button>
              {editingId !== null && (
                <Button type="button" variant="secondary" className="h-11 rounded-xl" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/60 p-4">
            <div className="rounded-xl border border-emerald-100 bg-white p-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <PackageCheck size={16} />
                <span className="text-xs font-bold">Healthy stock</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{healthyOnPage}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">On this page</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-white p-3">
              <div className="flex items-center gap-2 text-amber-700">
                <PackageX size={16} />
                <span className="text-xs font-bold">Low stock</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{lowOnPage}</p>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">5 units or fewer</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
