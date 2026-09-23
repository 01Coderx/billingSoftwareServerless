"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { LoadingState, EmptyState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load(
    requestedPage = page,
    requestedSearch = search,
    requestedDate = dateFilter,
  ) {
    setLoading(true);
    setError("");

    try {
      const result = await api.invoices.list({
        page: requestedPage,
        limit: PAGE_SIZE,
        search: requestedSearch.trim(),
        date: requestedDate,
      });

      setInvoices(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load invoices",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    load(1, search, dateFilter);
  }

  function clearFilters() {
    setSearch("");
    setDateFilter("");
    load(1, "", "");
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;

    load(nextPage, search, dateFilter);
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this bill permanently?")) return;

    setDeletingId(id);
    setError("");

    try {
      await api.invoices.remove(id);

      const shouldGoBack =
        invoices.length === 1 && page > 1;

      await load(
        shouldGoBack ? page - 1 : page,
        search,
        dateFilter,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not delete invoice",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !invoices.length) {
    return <LoadingState label="Loading bills…" />;
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Sales"
        title="Bills"
        description="Create, inspect, update, delete and download bills."
        actionHref="/invoices/new"
        actionLabel="New bill"
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {!loading && !invoices.length && !search && !dateFilter ? (
        <EmptyState
          title="No bills yet"
          description="Create your first bill and it will appear here."
          action={
            <Button asChild>
              <Link href="/invoices/new">
                <Plus size={17} />
                Create bill
              </Link>
            </Button>
          }
        />
      ) : (
        <section className="card overflow-hidden">
          {/* FILTERS */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                className="input w-full pl-10"
                placeholder="Search bill, customer or status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyFilters();
                  }
                }}
              />
            </div>

            <input
              type="date"
              className="input w-full shrink-0 lg:w-[180px]"
              value={dateFilter}
              onChange={(e) => {
                const value = e.target.value;
                setDateFilter(value);
                load(1, search, value);
              }}
              aria-label="Filter bills by date"
            />

            <Button
              onClick={applyFilters}
              disabled={loading}
            >
              <Search size={16} />
              Search
            </Button>

            {(search || dateFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-bold text-slate-500 hover:text-slate-900"
              >
                Clear
              </button>
            )}

            <Button
              variant="secondary"
              onClick={() => load(page, search, dateFilter)}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </Button>
          </div>

          {/* DESKTOP HEADER */}
          <div className="hidden grid-cols-[1.2fr_1.2fr_.8fr_.8fr_.8fr_90px] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 md:grid">
            <div>Bill</div>
            <div>Customer</div>
            <div>Date</div>
            <div>Status</div>
            <div>Total</div>
            <div />
          </div>

          {/* LIST */}
          <div className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid gap-3 p-5 md:grid-cols-[1.2fr_1.2fr_.8fr_.8fr_.8fr_90px] md:items-center"
              >
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="min-w-0"
                >
                  <div className="font-black">
                    {invoice.invoiceNumber}
                  </div>

                  <div className="text-xs text-slate-500">
                    #{invoice.id}
                  </div>
                </Link>

                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-sm font-semibold text-slate-700"
                >
                  {invoice.customer?.name ||
                    "Walk-in customer"}
                </Link>

                <div className="text-xs font-semibold text-slate-500">
                  {formatDate(invoice.createdAt)}
                </div>

                <div>
                  <StatusBadge
                    status={
                      invoice.paymentStatus ||
                      invoice.status
                    }
                  />
                </div>

                <div className="text-sm font-black">
                  {formatCurrency(invoice.total)}
                </div>

                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="btn btn-ghost !p-2 text-slate-500"
                    aria-label={`Open ${invoice.invoiceNumber}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>

                  <button
                    onClick={() => remove(invoice.id)}
                    disabled={deletingId === invoice.id}
                    className="btn btn-ghost !p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                    aria-label={`Delete ${invoice.invoiceNumber}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 md:hidden">
                  <span className="text-xs text-slate-500">
                    Total
                  </span>

                  <strong>
                    {formatCurrency(invoice.total)}
                  </strong>
                </div>
              </div>
            ))}

            {!invoices.length && (
              <div className="p-12 text-center text-sm text-slate-400">
                No bills match your search.
              </div>
            )}
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>

              <Button
                variant="secondary"
                onClick={() => goToPage(page + 1)}
                disabled={
                  page >= totalPages || loading
                }
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
        <FileText size={14} />
        Showing only {PAGE_SIZE} bills per request.
      </div>
    </div>
  );
}
