"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  LoaderCircle,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Customer, Invoice, InvoiceDraft, Product } from "@/types/billing";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Line = {
  product: Product;
  rate: number;
  quantity: number;
};

type Props = {
  mode: "create" | "edit";
  initialInvoice?: Invoice;
  onSaved: (invoice: Invoice) => void;
};

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50";

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

function buildLines(invoice: Invoice): Line[] {
  return (invoice.items || [])
    .filter((item) => item.product?.id)
    .map((item) => ({
      product: item.product,
      rate: Math.max(0, safeNumber(item.rate ?? item.product.price)),
      quantity: clampQuantity(safeNumber(item.quantity, 1)),
    }));
}

function getCustomerLabel(customer: Customer) {
  const value = customer as Customer & {
    name?: string;
    fullName?: string;
    phone?: string;
    mobile?: string;
  };
  return value.name || value.fullName || `Customer #${value.id}`;
}

function getCustomerMeta(customer: Customer) {
  const value = customer as Customer & {
    phone?: string;
    mobile?: string;
    email?: string;
  };
  return value.phone || value.mobile || value.email || "";
}

function getProductLabel(product: Product) {
  return product.name || `Product #${product.id}`;
}

export default function InvoiceForm({ mode, initialInvoice, onSaved }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerId, setCustomerId] = useState(
    initialInvoice?.customer?.id ? String(initialInvoice.customer.id) : "",
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerSaving, setNewCustomerSaving] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const [productOpen, setProductOpen] = useState(false);

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductRate, setNewProductRate] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductSaving, setNewProductSaving] = useState(false);

  const [dueDate, setDueDate] = useState(toDateInput(initialInvoice?.dueDate));
  const [status, setStatus] = useState(initialInvoice?.status || "SENT");
  const [tax, setTax] = useState(Math.max(0, safeNumber(initialInvoice?.tax)));
  const [discount, setDiscount] = useState(
    Math.max(0, safeNumber(initialInvoice?.discount)),
  );
  const [lines, setLines] = useState<Line[]>(
    initialInvoice ? buildLines(initialInvoice) : [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([api.products.getAll(), api.customers.list()])
      .then(([productData, customerData]) => {
        if (!active) return;
        setProducts(productData || []);
        setCustomers(customerData || []);

        if (initialInvoice?.customer) {
          setCustomerQuery(getCustomerLabel(initialInvoice.customer));
        }
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load invoice data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialInvoice]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) =>
        customer.id ? String(customer.id) === customerId : false,
      ),
    [customers, customerId],
  );

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers.slice(0, 8);

    return customers
      .filter((customer) => {
        const label = getCustomerLabel(customer).toLowerCase();
        const meta = getCustomerMeta(customer).toLowerCase();
        return label.includes(query) || meta.includes(query);
      })
      .slice(0, 8);
  }, [customers, customerQuery]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products.slice(0, 8);

    return products
      .filter((product) => {
        const name = getProductLabel(product).toLowerCase();
        const sku = String(product.sku || "").toLowerCase();
        return name.includes(query) || sku.includes(query);
      })
      .slice(0, 8);
  }, [products, productQuery]);

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + safeNumber(line.rate) * safeNumber(line.quantity),
        0,
      ),
    [lines],
  );

  const total = Math.max(
    0,
    subtotal + Math.max(0, safeNumber(tax)) - Math.max(0, safeNumber(discount)),
  );
  const totalQuantity = lines.reduce(
    (sum, line) => sum + safeNumber(line.quantity),
    0,
  );

  function selectCustomer(customer: Customer) {
    if (!customer.id) return;
    setCustomerId(String(customer.id));
    setCustomerQuery(getCustomerLabel(customer));
    setCustomerOpen(false);
    setError("");
  }

  function clearCustomer() {
    setCustomerId("");
    setCustomerQuery("");
  }

  async function saveNewCustomer() {
    const name = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    const email = newCustomerEmail.trim();
    const address = newCustomerAddress.trim();

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    setNewCustomerSaving(true);
    setError("");

    try {
      const customer = await api.customers.create({ name, phone, email, address });
      setCustomers((current) => [customer, ...current]);
      setCustomerId(String(customer.id));
      setCustomerQuery(getCustomerLabel(customer));
      setAddCustomerOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewCustomerAddress("");
      setCustomerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create customer");
    } finally {
      setNewCustomerSaving(false);
    }
  }

  function addProduct(product: Product) {
    if (!product?.id) return;

    setLines((current) => {
      const found = current.find((line) => line.product.id === product.id);
      if (found) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: clampQuantity(line.quantity + 1) }
            : line,
        );
      }

      return [
        ...current,
        {
          product,
          rate: Math.max(0, safeNumber(product.price)),
          quantity: 0,
        },
      ];
    });

    setProductQuery("");
    setProductOpen(false);
    setError("");
  }

  async function saveNewProduct() {
    const name = newProductName.trim();
    const sku = newProductSku.trim();
    const price = Number(newProductRate);

    if (!name) {
      setError("Product name is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid rate.");
      return;
    }

    setNewProductSaving(true);
    setError("");

    try {
      const product = await api.products.create({
        name,
        sku,
        price,
        stock: 0,
        description: "",
        taxable: true,
      });
      setProducts((current) => [product, ...current]);
      addProduct(product);
      setAddProductOpen(false);
      setNewProductName("");
      setNewProductRate("");
      setNewProductSku("");
      setProductQuery("");
      setProductOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create product");
    } finally {
      setNewProductSaving(false);
    }
  }

  function changeQty(id: number, delta: number) {
    setLines((current) =>
      current.map((line) =>
        line.product.id === id
          ? { ...line, quantity: clampQuantity(line.quantity + delta) }
          : line,
      ),
    );
  }

  function changeQuantityInput(id: number, value: string) {
    if (value === "") {
      setLines((current) =>
        current.map((line) =>
          line.product.id === id ? { ...line, quantity: 0 } : line,
        ),
      );
      return;
    }

    const quantity = Number(value);
    if (!Number.isFinite(quantity)) return;

    setLines((current) =>
      current.map((line) =>
        line.product.id === id
          ? { ...line, quantity: Math.max(0, quantity) }
          : line,
      ),
    );
  }

  function changeRate(id: number, value: string) {
    const rate = Math.max(0, safeNumber(value));
    setLines((current) =>
      current.map((line) =>
        line.product.id === id ? { ...line, rate } : line,
      ),
    );
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((line) => line.product.id !== id));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!lines.length) {
      setError("Add at least one product before saving this invoice.");
      return;
    }

    if (mode === "edit" && !initialInvoice?.id) {
      setError("This invoice cannot be updated because its id is missing.");
      return;
    }

    for (const line of lines) {
      if (Number(line.quantity) <= 0) {
        setError(
          `Quantity for ${getProductLabel(line.product)} must be greater than zero.`,
        );
        return;
      }
    }

    const payload: InvoiceDraft = {
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
      customer: customerId ? { id: Number(customerId) } : null,
      tax: Math.max(0, safeNumber(tax)),
      discount: Math.max(0, safeNumber(discount)),
      status,
      items: lines.map((line) => ({
        productId: Number(line.product.id),
        rate: Math.max(0, safeNumber(line.rate)),
        quantity: clampQuantity(safeNumber(line.quantity, 0.01)),
      })),
    };

    setSaving(true);
    try {
      const invoice =
        mode === "create"
          ? await api.invoices.create(payload)
          : await api.invoices.update(initialInvoice!.id, payload);
      onSaved(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invoice");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fade-in mx-auto w-full max-w-[1500px] space-y-5">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto w-full max-w-[1500px] space-y-5 pb-8">
      <Link
        href={mode === "edit" && initialInvoice ? `/invoices/${initialInvoice.id}` : "/invoices"}
        className="inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-slate-500 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeft size={16} />
        {mode === "edit" ? "Back to invoice" : "Back to invoices"}
      </Link>

      <PageHeader
        eyebrow="Sales · Billing"
        title={mode === "create" ? "Create invoice" : "Edit invoice"}
        description={
          mode === "create"
            ? "Choose a customer, add the items, review the total and create your bill."
            : "Update the customer, items and due date, then save your changes."
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 py-3.5 sm:px-5">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
          <FileText size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">
            {mode === "create" ? "Build a clear, accurate bill" : "Review your invoice changes"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Prices and totals are checked by the backend before saving.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
          <span className="size-2 rounded-full bg-blue-500" /> Customer
          <span className="text-slate-300">›</span>
          <span className="size-2 rounded-full bg-blue-500" /> Items
          <span className="text-slate-300">›</span>
          <span className="size-2 rounded-full bg-blue-500" /> Review
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Something needs your attention</p>
            <p className="mt-0.5 break-words leading-5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100 hover:text-rose-800"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-5">
          {/* Customer and invoice details */}
          <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <UserRound size={19} />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">Customer & invoice details</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Select who you are billing and set the due date.</p>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)]">
              <div className="relative min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="invoice-customer" className="text-sm font-bold text-slate-700">Customer</label>
                  {selectedCustomer && (
                    <button type="button" onClick={clearCustomer} className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-blue-700 hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="invoice-customer"
                    className={`${inputClassName} pl-10 pr-10`}
                    placeholder="Search name, phone or email"
                    value={customerQuery}
                    onFocus={() => setCustomerOpen(true)}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerId("");
                      setCustomerOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setCustomerOpen(false);
                      if (e.key === "Enter" && filteredCustomers[0]) {
                        e.preventDefault();
                        selectCustomer(filteredCustomers[0]);
                      }
                    }}
                    autoComplete="off"
                    aria-expanded={customerOpen}
                    aria-controls="customer-suggestions"
                  />
                  <ChevronDown size={16} className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition ${customerOpen ? "rotate-180" : ""}`} />
                </div>

                {customerOpen && filteredCustomers.length > 0 && (
                  <div id="customer-suggestions" className="absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                    <p className="px-2.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Choose a customer</p>
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCustomer(customer)}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">{getCustomerLabel(customer).trim().charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{getCustomerLabel(customer)}</span>
                          {getCustomerMeta(customer) && <span className="mt-0.5 block truncate text-xs text-slate-500">{getCustomerMeta(customer)}</span>}
                        </span>
                        {selectedCustomer?.id === customer.id && <Check size={17} className="shrink-0 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {customerOpen && customerQuery && filteredCustomers.length === 0 && (
                  <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    <div className="px-4 py-3 text-sm text-slate-500">No matching customer found.</div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setNewCustomerName(customerQuery.trim());
                        setNewCustomerPhone("");
                        setNewCustomerEmail("");
                        setNewCustomerAddress("");
                        setCustomerOpen(false);
                        setAddCustomerOpen(true);
                      }}
                    >
                      <UserPlus size={17} /> Add “{customerQuery.trim()}”
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs leading-5 text-slate-500">Leave blank for a walk-in customer.</p>
              </div>

              <div>
                <label htmlFor="invoice-due-date" className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CalendarDays size={15} className="text-slate-400" /> Due date
                </label>
                <input id="invoice-due-date" className={inputClassName} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <p className="mt-2 text-xs leading-5 text-slate-500">When payment is expected.</p>
              </div>

              <div>
                <label htmlFor="invoice-status" className="text-sm font-bold text-slate-700">Invoice status</label>
                <select id="invoice-status" className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">Choose the current bill status.</p>
              </div>
            </div>
          </section>

          {/* Invoice line items */}
          <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100"><Boxes size={19} /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900">Items in this invoice</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{lines.length} {lines.length === 1 ? "item" : "items"}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Search by product name or SKU, then add it to the bill.</p>
                </div>
              </div>

              <div className="relative w-full sm:max-w-[360px]">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="invoice-product-search"
                  className={`${inputClassName} pl-10 pr-3`}
                  placeholder="Search products or SKU…"
                  value={productQuery}
                  onFocus={() => setProductOpen(true)}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setProductOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setProductOpen(false);
                    if (e.key === "Enter" && filteredProducts[0]) {
                      e.preventDefault();
                      addProduct(filteredProducts[0]);
                    }
                  }}
                  autoComplete="off"
                  aria-expanded={productOpen}
                  aria-controls="product-suggestions"
                />
                {productOpen && filteredProducts.length > 0 && (
                  <div id="product-suggestions" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                    <p className="px-2.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Matching products</p>
                    {filteredProducts.map((product) => (
                      <button key={product.id} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" onMouseDown={(e) => e.preventDefault()} onClick={() => addProduct(product)}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><PackagePlus size={17} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{getProductLabel(product)}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{product.sku || "No SKU"} · {formatCurrency(product.price)}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-100"><Plus size={13} /> Add</span>
                      </button>
                    ))}
                  </div>
                )}
                {productOpen && productQuery && filteredProducts.length === 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    <p className="px-4 py-3 text-sm text-slate-500">No matching product found.</p>
                    <button type="button" className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-blue-700 transition hover:bg-blue-50" onMouseDown={(e) => e.preventDefault()} onClick={() => { setNewProductName(productQuery.trim()); setNewProductRate(""); setNewProductSku(""); setProductOpen(false); setAddProductOpen(true); }}>
                      <PackagePlus size={17} /> Create “{productQuery.trim()}”
                    </button>
                  </div>
                )}
              </div>
            </div>

            {lines.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const id = line.product.id!;
                  const amount = safeNumber(line.rate) * safeNumber(line.quantity);
                  return (
                    <article key={id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/60 sm:px-6 md:grid-cols-[minmax(0,1fr)_135px_minmax(180px,0.9fr)] xl:grid-cols-[minmax(0,1fr)_125px_185px_120px_40px] xl:items-center">
                      <div className="flex min-w-0 items-start gap-3 xl:items-center">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Boxes size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-extrabold leading-5 text-slate-900">{getProductLabel(line.product)}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                            {line.product.sku || "No SKU"}{" · "}Cost {formatCurrency(line.product.costPrice)}{" · "}Default {formatCurrency(line.product.price)}
                          </p>
                        </div>
                      </div>

                      <label className="block text-xs font-bold text-slate-500">
                        Selling rate (₹)
                        <input className={`${inputClassName} mt-1.5`} type="number" min="0" step="0.01" value={line.rate} onChange={(e) => changeRate(id, e.target.value)} aria-label={`Selling rate for ${getProductLabel(line.product)}`} />
                      </label>

                      <div>
                        <p className="text-xs font-bold text-slate-500">Quantity</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => changeQty(id, -0.1)} aria-label={`Decrease quantity for ${getProductLabel(line.product)}`}><Minus size={15} /></button>
                          <input type="number" inputMode="decimal" min="0" step="0.01" value={line.quantity} className="h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-extrabold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" onChange={(e) => changeQuantityInput(id, e.target.value)} aria-label={`Quantity for ${getProductLabel(line.product)}`} />
                          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => changeQty(id, 0.1)} aria-label={`Increase quantity for ${getProductLabel(line.product)}`}><Plus size={15} /></button>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Weight example: 0.1 = 100g · 0.5 = 500g</p>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 xl:block xl:bg-transparent xl:px-0 xl:py-0 xl:text-right">
                        <p className="text-xs font-bold text-slate-500">Line total</p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums text-slate-900">{formatCurrency(amount)}</p>
                      </div>

                      <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-3 text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 xl:size-10 xl:px-0" onClick={() => removeLine(id)} aria-label={`Remove ${getProductLabel(line.product)}`} title="Remove item"><Trash2 size={16} /><span className="xl:hidden">Remove item</span></button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-12 text-center sm:px-8">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><PackagePlus size={24} /></div>
                <h3 className="mt-4 text-sm font-extrabold text-slate-800">No items added yet</h3>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">Search for a product above. Once added, you can change its rate and quantity here.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:px-6">
              <p className="text-xs font-medium text-slate-500">{lines.length} line {lines.length === 1 ? "item" : "items"} added</p>
              <p className="text-sm font-extrabold tabular-nums text-slate-800">Items subtotal <span className="ml-2 text-blue-700">{formatCurrency(subtotal)}</span></p>
            </div>
          </section>

          {/* Taxes and discounts */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100"><FileText size={18} /></div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">Tax & discount</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Add any bill-level charges or discount amounts.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Tax amount (₹)
                <input className={inputClassName} type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(Math.max(0, safeNumber(e.target.value)))} />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Discount amount (₹)
                <input className={inputClassName} type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Math.max(0, safeNumber(e.target.value)))} />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Enter amounts in rupees. The final total cannot be less than zero.</p>
          </section>
        </section>

        {/* Sticky invoice summary */}
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          <div className="bg-slate-950 px-5 py-5 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/10"><FileText size={19} /></div>
              <div>
                <h2 className="text-base font-extrabold">Invoice summary</h2>
                <p className="mt-1 text-xs text-slate-300">{mode === "create" ? "Review before creating" : "Review before updating"}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <span className="text-sm text-slate-300">Items added</span>
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-extrabold tabular-nums">{lines.length}</span>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Total quantity</span>
              <span className="font-bold tabular-nums text-slate-800">{totalQuantity.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold tabular-nums text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Tax</span>
              <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(Math.max(0, safeNumber(tax)))}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="font-semibold tabular-nums text-emerald-700">−{formatCurrency(Math.max(0, safeNumber(discount)))}</span>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">Total payable</p>
                  <p className="mt-1 text-xs text-slate-400">Including tax and discount</p>
                </div>
                <p className="text-right text-2xl font-black tracking-tight tabular-nums text-slate-950">{formatCurrency(total)}</p>
              </div>
            </div>

            <Button type="submit" className="mt-1 h-12 w-full rounded-xl text-sm font-extrabold shadow-sm" disabled={saving || !lines.length}>
              {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
              {saving ? "Saving invoice…" : mode === "create" ? "Create invoice" : "Save invoice changes"}
            </Button>
            <Link href={mode === "edit" && initialInvoice ? `/invoices/${initialInvoice.id}` : "/invoices"} className="flex h-10 items-center justify-center rounded-xl text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              Cancel and go back
            </Link>
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-800">
              <Check size={15} className="mt-0.5 shrink-0" />
              <p>Your backend validates the invoice and recalculates the final amounts before saving.</p>
            </div>
          </div>
        </aside>
      </form>

      {/* Add customer dialog */}
      {addCustomerOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[3px]" onMouseDown={(e) => { if (e.target === e.currentTarget && !newCustomerSaving) setAddCustomerOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-customer-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserPlus size={19} /></div>
                <div><h2 id="add-customer-title" className="text-lg font-extrabold text-slate-900">Add new customer</h2><p className="mt-1 text-sm text-slate-500">Save their details without leaving this invoice.</p></div>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" disabled={newCustomerSaving} onClick={() => setAddCustomerOpen(false)} aria-label="Close add customer dialog"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <label className="block text-sm font-bold text-slate-700">Customer name <span className="text-rose-500">*</span><input className={inputClassName} value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Enter customer name" autoFocus /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700">Phone number<input className={inputClassName} value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Optional phone number" /></label>
                <label className="block text-sm font-bold text-slate-700">Email address<input className={inputClassName} type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="Optional email" /></label>
              </div>
              <label className="block text-sm font-bold text-slate-700">Address<textarea className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50" rows={3} value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="Optional billing address" /></label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" className="h-11 rounded-xl" disabled={newCustomerSaving} onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
              <Button type="button" className="h-11 rounded-xl" disabled={newCustomerSaving || !newCustomerName.trim()} onClick={() => void saveNewCustomer()}>{newCustomerSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{newCustomerSaving ? "Saving customer…" : "Save customer"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add product dialog */}
      {addProductOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[3px]" onMouseDown={(e) => { if (e.target === e.currentTarget && !newProductSaving) setAddProductOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><PackagePlus size={19} /></div>
                <div><h2 id="add-product-title" className="text-lg font-extrabold text-slate-900">Add new product</h2><p className="mt-1 text-sm text-slate-500">Create a product and add it to this bill.</p></div>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" disabled={newProductSaving} onClick={() => setAddProductOpen(false)} aria-label="Close add product dialog"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <label className="block text-sm font-bold text-slate-700">Product name <span className="text-rose-500">*</span><input className={inputClassName} value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Enter product name" autoFocus /></label>
              <label className="block text-sm font-bold text-slate-700">Selling rate (₹) <span className="text-rose-500">*</span><input className={inputClassName} type="number" min="0" step="0.01" value={newProductRate} onChange={(e) => setNewProductRate(e.target.value)} placeholder="0.00" /></label>
              <label className="block text-sm font-bold text-slate-700">SKU <span className="font-normal text-slate-400">(optional)</span><input className={inputClassName} value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} placeholder="Enter product code" /></label>
              <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">This creates the product with stock set to 0. Add stock separately if you track inventory.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" className="h-11 rounded-xl" disabled={newProductSaving} onClick={() => setAddProductOpen(false)}>Cancel</Button>
              <Button type="button" className="h-11 rounded-xl" disabled={newProductSaving || !newProductName.trim() || newProductRate.trim() === "" || !Number.isFinite(Number(newProductRate)) || Number(newProductRate) < 0} onClick={() => void saveNewProduct()}>{newProductSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{newProductSaving ? "Saving product…" : "Save and add product"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
