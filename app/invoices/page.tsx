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
