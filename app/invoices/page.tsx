"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { label: "All bills", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Drafts", value: "DRAFT" },
] as const;

function InvoiceRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-5 md:grid-cols-[1.15fr_1.2fr_.95fr_1.1fr_.85fr_84px] md:items-center">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 max-w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-24" />
      <div className="flex justify-end gap-2">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
    </div>
  );
}

function isInvoiceOverdue(invoice: Invoice): boolean {
  if (
    !invoice.dueDate ||
    invoice.paymentStatus === "PAID" ||
    invoice.status === "CANCELLED" ||
    invoice.status === "DRAFT"
  ) {
    return false;
  }

  // Compare calendar days so an invoice is not marked overdue during its due date.
  const dueDateText = String(invoice.dueDate).slice(0, 10);
  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return /^\d{4}-\d{2}-\d{2}$/.test(dueDateText) && dueDateText < todayText;
}

function paymentStatusLabel(invoice: Invoice): string {
  if (invoice.status === "CANCELLED") return "Payment not applicable";
  if (invoice.status === "DRAFT") return "Not sent";

  switch (invoice.paymentStatus) {
    case "PAID":
      return "Fully paid";
    case "PARTIAL":
      return "Partially paid";
    default:
      return "Payment pending";
  }
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Ignore stale responses when a user changes filters quickly.
  const latestRequestId = useRef(0);

  const load = useCallback(
    async (
      requestedPage: number,
      requestedSearch: string,
      requestedDate: string,
      requestedStatus: string,
    ) => {
      const requestId = ++latestRequestId.current;
      setLoading(true);
      setError("");

      try {
        const result = await api.invoices.list({
          page: requestedPage,
          limit: PAGE_SIZE,
          search: requestedSearch.trim(),
          date: requestedDate,
          status: requestedStatus,
        });

        if (requestId !== latestRequestId.current) return;

        setInvoices(result.invoices);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages || 1));
        setPage(result.page || requestedPage);
      } catch (e) {
        if (requestId !== latestRequestId.current) return;
        setError(e instanceof Error ? e.message : "Could not load invoices.");
      } finally {
        if (requestId === latestRequestId.current) setLoading(false);
      }
    },
    [],
  );

  // One debounced fetch for initial load and for search/date/status changes.
  useEffect(() => {
    const delay = search.trim() || dateFilter || statusFilter ? 300 : 0;
    const timer = window.setTimeout(() => {
      void load(1, search, dateFilter, statusFilter);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [load, search, dateFilter, statusFilter]);

  useEffect(() => {
    return () => {
      latestRequestId.current += 1;
    };
  }, []);

  async function remove(id: number) {
    const invoiceToDelete = invoices.find((invoice) => invoice.id === id);
    const invoiceLabel = invoiceToDelete?.invoiceNumber || `#${id}`;

    if (!window.confirm(`Delete bill ${invoiceLabel}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      await api.invoices.remove(id);

      const nextPage = invoices.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, search, dateFilter, statusFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this bill.");
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("");
    setStatusFilter("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(search.trim() || dateFilter || statusFilter);
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        eyebrow="Sales management"
        title="Invoices"
        description="Create bills, track payments, and quickly find the invoice you need."
        actionHref="/invoices/new"
        actionLabel="Create invoice"
      />

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <X size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-rose-900">Could not complete the request</p>
              <p className="mt-1 break-words text-sm text-rose-700">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 border border-rose-200 bg-white"
            onClick={() => void load(page, search, dateFilter, statusFilter)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Try again
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Status filters */}
        <div className="border-b border-slate-100 px-3 pt-3 sm:px-5 sm:pt-4">
          <div
            role="group"
            aria-label="Filter invoices by status"
            className="flex gap-1 overflow-x-auto pb-3"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 sm:px-4 ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-900/10"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="invoice-search"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Search invoices
            </label>
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="invoice-search"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Invoice number, customer, or status"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="w-full shrink-0 sm:w-[220px]">
            <label
              htmlFor="invoice-date-filter"
              className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Invoice date
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="invoice-date-filter"
                type="date"
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter invoices by invoice date"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl px-3 text-slate-600"
                onClick={clearFilters}
              >
                <X size={15} />
                Clear filters
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-xl border border-slate-200 bg-white px-4"
              onClick={() => void load(page, search, dateFilter, statusFilter)}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <SlidersHorizontal size={14} />
            {loading && invoices.length > 0 ? (
              <span>Updating invoices…</span>
            ) : (
              <span>
                {total === 0
                  ? "No invoices found"
                  : `Showing ${firstItem}–${lastItem} of ${total} invoice${total === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Sorted by newest first</p>
        </div>

        {/* Invoice list */}
        <div aria-busy={loading} className={loading && invoices.length > 0 ? "opacity-60 transition-opacity" : ""}>
          {loading && invoices.length === 0 ? (
            <div role="status" aria-label="Loading invoices" className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <InvoiceRowSkeleton key={index} />
              ))}
              <span className="sr-only">Loading invoices…</span>
            </div>
          ) : invoices.length > 0 ? (
            <>
              <div className="hidden grid-cols-[1.15fr_1.2fr_.95fr_1.1fr_.85fr_84px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 md:grid">
                <div>Bill</div>
                <div>Customer</div>
                <div>Invoice / due date</div>
                <div>Bill status</div>
                <div>Amount</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const overdue = isInvoiceOverdue(invoice);
                  const outstanding = Number(invoice.amountDue || 0);

                  return (
                    <article
                      key={invoice.id}
                      className="grid grid-cols-1 gap-4 px-4 py-5 transition-colors hover:bg-slate-50/70 sm:grid-cols-2 sm:px-5 md:grid-cols-[1.15fr_1.2fr_.95fr_1.1fr_.85fr_84px] md:items-center md:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                          Bill
                        </p>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md text-sm font-extrabold text-slate-900 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <FileText size={16} className="shrink-0 text-blue-600" />
                          <span className="truncate">{invoice.invoiceNumber}</span>
                          <ArrowUpRight size={13} className="shrink-0 text-slate-300" />
                        </Link>
                        <p className="mt-1 pl-[22px] text-xs text-slate-400">Invoice ID #{invoice.id}</p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                          Customer
                        </p>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="block truncate text-sm font-semibold text-slate-700 transition hover:text-blue-700"
                        >
                          {invoice.customer?.name || "Walk-in customer"}
                        </Link>
                        {invoice.customer?.phone ? (
                          <p className="mt-1 truncate text-xs text-slate-400">{invoice.customer.phone}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">Customer details</p>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                          Invoice / due date
                        </p>
                        <p className="text-sm font-medium text-slate-700">{formatDate(invoice.createdAt)}</p>
                        {invoice.dueDate ? (
                          <p className={`mt-1 text-xs ${overdue ? "font-bold text-rose-600" : "text-slate-400"}`}>
                            Due {formatDate(invoice.dueDate)}{overdue ? " · Overdue" : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">No due date</p>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                          Bill status
                        </p>
                        <StatusBadge status={invoice.status} />
                        <p className="mt-1.5 text-xs text-slate-500">{paymentStatusLabel(invoice)}</p>
                        {overdue && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 md:hidden">
                            <CircleDollarSign size={12} /> Payment overdue
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 md:hidden">
                          Total amount
                        </p>
                        <p className="text-base font-extrabold tracking-tight text-slate-900">
                          {formatCurrency(invoice.total)}
                        </p>
                        {invoice.status !== "CANCELLED" && outstanding > 0 && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Due {formatCurrency(outstanding)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 sm:col-span-2 md:col-span-1 md:border-0 md:pt-0">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={`Open ${invoice.invoiceNumber}`}
                          title="Open invoice"
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void remove(invoice.id)}
                          disabled={deletingId === invoice.id}
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                          title="Delete invoice"
                        >
                          {deletingId === invoice.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-5 py-14 text-center sm:py-16">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                {hasActiveFilters ? <Search size={23} /> : <FileText size={23} />}
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                {error
                  ? "Could not load invoices"
                  : hasActiveFilters
                    ? "No matching invoices"
                    : "No invoices yet"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
                {error
                  ? "Check your connection and try loading the invoices again."
                  : hasActiveFilters
                    ? "Try a different search, date, or status filter."
                    : "Your invoices will appear here after you create your first bill."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hasActiveFilters ? (
                  <Button type="button" variant="secondary" onClick={clearFilters}>
                    <X size={16} />
                    Clear filters
                  </Button>
                ) : error ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void load(page, search, dateFilter, statusFilter)}
                  >
                    <RefreshCw size={16} />
                    Try again
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/invoices/new">
                      <Plus size={17} />
                      Create your first invoice
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs font-medium text-slate-500">
              Page <span className="font-bold text-slate-700">{page}</span> of{" "}
              <span className="font-bold text-slate-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3"
                onClick={() => void load(page - 1, search, dateFilter, statusFilter)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3"
                onClick={() => void load(page + 1, search, dateFilter, statusFilter)}
                disabled={page >= totalPages || loading}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <p>
          Invoices are loaded from your billing database. PDF downloads remain available from each invoice&apos;s detail/print page.
        </p>
      </div>
    </div>
  );
}
