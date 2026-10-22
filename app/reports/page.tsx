"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  IndianRupee,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  UserRoundCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";

const moneyTooltip = (value: unknown) => formatCurrency(Number(value || 0));
const numberFormat = (value: unknown) => Number(value || 0).toLocaleString("en-IN");

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value?: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return "Selected month";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function MetricCard({ label, value, sub, icon: Icon, tone = "blue" }: any) {
  const tones: Record<string, { icon: string; glow: string; dot: string }> = {
    blue: { icon: "bg-blue-600 text-white shadow-blue-200", glow: "bg-blue-100", dot: "bg-blue-500" },
    emerald: { icon: "bg-emerald-600 text-white shadow-emerald-200", glow: "bg-emerald-100", dot: "bg-emerald-500" },
    amber: { icon: "bg-amber-500 text-white shadow-amber-200", glow: "bg-amber-100", dot: "bg-amber-500" },
    violet: { icon: "bg-violet-600 text-white shadow-violet-200", glow: "bg-violet-100", dot: "bg-violet-500" },
  };
  const style = tones[tone] || tones.blue;

  return (
    <article className="group relative isolate overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60">
      <div className={`pointer-events-none absolute -right-8 -top-8 -z-10 size-32 rounded-full opacity-70 blur-2xl ${style.glow}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</p>
        </div>
        <div className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110 ${style.icon}`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3">
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${style.dot}`} />
        <p className="text-xs leading-5 text-slate-500">{sub}</p>
      </div>
    </article>
  );
}

function Section({ title, description, icon: Icon, children, action }: any) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-sm">
            <Icon size={20} strokeWidth={2.1} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-28 place-items-center px-5 py-8 text-center text-sm text-slate-500">{children}</div>;
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const requestSequence = useRef(0);

  async function load(month: string, showRefresh = false) {
    const requestId = ++requestSequence.current;
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await api.reports.analytics(month);
      if (requestId !== requestSequence.current) return;

      const payload = result?.data ?? result;
      setData(payload);
      setError("");
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    setMounted(true);
    const month = getCurrentMonthValue();
    setSelectedMonth(month);
    void load(month);
    // Initial load intentionally runs once with the browser's local month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerMix = useMemo(() => {
    const c = data?.customerAnalysis;
    return [
      { name: "Recurring", value: Number(c?.recurringCustomers || 0) },
      { name: "One-time", value: Number(c?.oneTimeCustomers || 0) },
    ];
  }, [data]);

  if (loading) return <LoadingState label="Loading live reports…" />;

  const products = data?.productAnalysis || {};
  const customers = data?.customerAnalysis || {};
  const period = data?.periodSummary || {};
  const reportMonth = data?.selectedMonth || selectedMonth;
  const reportMonthLabel = formatMonthLabel(reportMonth);
  const rawTopProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
  const topProducts = rawTopProducts.map((p: any) => ({
    ...p,
    sales: Number(p.sales ?? p.totalSales ?? p.amount ?? 0),
    profit: Number(p.profit ?? p.totalProfit ?? 0),
    units: Number(p.units ?? p.quantity ?? p.totalQuantity ?? 0),
  }));
  const chartTopProducts = topProducts.slice(0, 8);
  const rawTopCustomers = Array.isArray(data?.topCustomers) ? data.topCustomers : [];
  const topCustomers = rawTopCustomers.map((c: any) => ({
    ...c,
    sales: Number(c.sales ?? c.totalSales ?? c.amount ?? 0),
    outstanding: Number(c.outstanding ?? c.due ?? c.balance ?? 0),
    invoices: Number(c.invoices ?? c.totalInvoices ?? c.invoiceCount ?? 0),
  }));
  const recurring = Array.isArray(data?.recurringCustomers)
    ? data.recurringCustomers
    : Array.isArray(data?.recurring) ? data.recurring : [];
  const lowStock = Array.isArray(data?.lowStockProducts)
    ? data.lowStockProducts
    : Array.isArray(data?.lowStock) ? data.lowStock : [];
  const monthlySales = Array.isArray(data?.monthlySales) ? data.monthlySales : [];

  return (
    <div className="fade-in space-y-6 pb-8">
      <PageHeader
        eyebrow="Business intelligence"
        title="Reports & Analysis"
        description="A clear view of sales performance, customer behaviour and inventory health from your billing data."
        actionHref="/invoices/new"
        actionLabel="Create invoice"
      />

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>
          <Button variant="secondary" onClick={() => void load(selectedMonth || getCurrentMonthValue(), true)}>Retry</Button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-violet-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm"><CalendarDays size={20} /></div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-slate-950">Monthly sales report</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Choose a month to see which products sold and how much each customer purchased.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
            <label htmlFor="report-month" className="sr-only">Select report month</label>
            <input
              id="report-month"
              aria-label="Select report month"
              type="month"
              value={selectedMonth}
              max={getCurrentMonthValue()}
              onChange={(event) => {
                const month = event.target.value;
                if (!month) return;
                setSelectedMonth(month);
                setError("");
                void load(month, true);
              }}
              className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
            <Button variant="secondary" className="h-11 rounded-xl" onClick={() => void load(selectedMonth || getCurrentMonthValue(), true)} disabled={refreshing || !selectedMonth}>
              <RefreshCw size={15} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
              {refreshing ? "Updating…" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 sm:px-6">
          <p className="text-sm font-bold text-slate-800">Report period: <span className="text-blue-700">{reportMonthLabel}</span></p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className={`size-2 rounded-full ${refreshing ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
            {refreshing ? "Updating selected month" : "Invoice data loaded"}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sales this month" value={formatCurrency(period.sales || 0)} sub={`Total invoice value for ${reportMonthLabel}`} icon={IndianRupee} tone="blue" />
        <MetricCard label="Invoices issued" value={numberFormat(period.invoices)} sub={`Non-cancelled invoices created in ${reportMonthLabel}`} icon={ReceiptText} tone="violet" />
        <MetricCard label="Customers with sales" value={numberFormat(customers.customers || customers.totalCustomers)} sub={`Unique customers billed in ${reportMonthLabel}`} icon={Users} tone="emerald" />
        <MetricCard label="Collected amount" value={formatCurrency(period.amountPaid || 0)} sub={`Payments recorded against invoices from ${reportMonthLabel}`} icon={TrendingUp} tone="amber" />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.9fr)]">
        <Section title="Product Analysis" description={`Product sales and profit for ${reportMonthLabel}.`} icon={BarChart3} action={<Link className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-800" href="/products">Manage products <ArrowUpRight size={14} /></Link>}>
          <div className="h-[340px] p-3 sm:h-[380px] sm:p-5">
            {mounted && topProducts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTopProducts} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.08)" }} />
                  <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={22} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState>No product sales were found for {reportMonthLabel}.</EmptyState>}
          </div>
        </Section>

        <Section title="Inventory Snapshot" description={`Current stock levels across ${numberFormat(products.products || products.totalProducts)} products.`} icon={PackageCheck} action={<span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-700">Target: {products.targetStock ?? 10}</span>}>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="text-xs font-semibold text-slate-500">Units left</div><div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{numberFormat(products.unitsInStock || products.totalStock)}</div></div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><div className="text-xs font-semibold text-amber-700">Need restock</div><div className="mt-2 text-2xl font-black tracking-tight text-amber-900">{numberFormat(products.lowStock || products.lowStockCount)}</div></div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><div className="text-xs font-semibold text-blue-700">Inventory value</div><div className="mt-2 break-words text-lg font-black tracking-tight text-blue-950">{formatCurrency(products.inventoryValue || products.totalValue || 0)}</div></div>
            </div>
            <div className="space-y-2">
              {lowStock.length ? lowStock.map((product: any) => (
                <div key={product.id || product._id || product.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/70">
                  <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-800">{product.name}</div><div className="mt-0.5 text-[11px] text-slate-500">{product.sku || "No SKU"}</div></div>
                  <div className="shrink-0 text-right"><div className="text-xs font-extrabold text-rose-600">{numberFormat(product.stock ?? product.quantity)} left</div><div className="mt-0.5 text-[10px] font-semibold text-slate-400">{numberFormat(product.required)} required</div></div>
                </div>
              )) : <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800"><span className="font-extrabold">Inventory looks healthy.</span> No products are at the restock threshold.</div>}
            </div>
          </div>
        </Section>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Section title="Products Sold This Month" description={`All products sold in ${reportMonthLabel}, ranked by sales.`} icon={ShoppingCart} action={<span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">{topProducts.length} products</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="bg-slate-50/90 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-3.5">Product</th><th className="px-5 py-3.5">Units</th><th className="px-5 py-3.5">Sales</th><th className="px-5 py-3.5">Profit</th></tr></thead>
              <tbody>{topProducts.map((product: any, index: number) => <tr key={product.id || product._id || index} className="border-t border-slate-100 transition hover:bg-slate-50/70"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">{index + 1}</span><div className="min-w-0"><div className="truncate font-bold text-slate-800">{product.name || "Unnamed product"}</div><div className="text-[11px] text-slate-500">{product.sku || "No SKU"}</div></div></div></td><td className="px-5 py-3.5 font-semibold text-slate-600">{numberFormat(product.units)}</td><td className="px-5 py-3.5 font-extrabold text-slate-900">{formatCurrency(product.sales)}</td><td className="px-5 py-3.5 font-bold text-emerald-600">{formatCurrency(product.profit)}</td></tr>)}</tbody>
            </table>
            {!topProducts.length && <EmptyState>No product sales were found for {reportMonthLabel}.</EmptyState>}
          </div>
        </Section>

        <Section title="Customer Analysis" description={`Customer sales and repeat behaviour in ${reportMonthLabel}.`} icon={Users}>
          <div className="grid gap-5 p-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
            <div className="h-36 min-w-0">
              {mounted && (customers.customers || customers.totalCustomers) ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={customerMix} dataKey="value" nameKey="name" innerRadius={42} outerRadius={60} paddingAngle={4} stroke="none">{customerMix.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#2563eb" : "#cbd5e1"} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} /></PieChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl bg-slate-50 text-xs text-slate-400">No customer data</div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><div className="text-xs font-semibold text-blue-700">Total customers</div><div className="mt-2 text-xl font-black text-blue-950">{numberFormat(customers.customers || customers.totalCustomers)}</div></div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"><div className="text-xs font-semibold text-emerald-700">Customer sales</div><div className="mt-2 break-words text-lg font-black text-emerald-950">{formatCurrency(customers.sales || customers.totalSales || 0)}</div></div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"><div className="text-xs font-semibold text-violet-700">Recurring</div><div className="mt-2 text-xl font-black text-violet-950">{numberFormat(customers.recurringCustomers)}</div></div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><div className="text-xs font-semibold text-amber-700">Outstanding</div><div className="mt-2 break-words text-lg font-black text-amber-950">{formatCurrency(customers.outstanding || customers.due || 0)}</div></div>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Section title="Recurring Customers" description={`Customers with two or more non-cancelled invoices in ${reportMonthLabel}.`} icon={UserRoundCheck} action={<span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">{recurring.length} shown</span>}>
          <div className="divide-y divide-slate-100">
            {recurring.length ? recurring.map((customer: any) => (
              <div key={customer.id || customer._id || customer.name} className="flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50/70 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-50 text-sm font-black text-violet-700">{String(customer.name || "C").trim().charAt(0).toUpperCase()}</div><div className="min-w-0"><div className="truncate font-bold text-slate-800">{customer.name || "Unnamed customer"}</div><div className="mt-1 truncate text-xs text-slate-500">{customer.invoices ?? customer.invoiceCount ?? 0} invoices · {customer.phone || customer.email || "No contact"}</div></div></div><div className="shrink-0 text-right"><div className="font-extrabold text-slate-900">{formatCurrency(customer.sales ?? customer.totalSales ?? 0)}</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total sales</div></div></div>
            )) : <EmptyState>No repeat customers found for {reportMonthLabel}.</EmptyState>}
          </div>
        </Section>

        <Section title="Customer Sales Breakdown" description={`All customers with sales in ${reportMonthLabel}, ranked by total invoice value.`} icon={TrendingUp} action={<span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">{topCustomers.length} customers</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-slate-50/90 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-3.5">Customer</th><th className="px-5 py-3.5">Invoices</th><th className="px-5 py-3.5">Sales</th><th className="px-5 py-3.5">Due</th></tr></thead>
              <tbody>{topCustomers.map((customer: any, index: number) => <tr key={customer.id || customer._id || index} className="border-t border-slate-100 transition hover:bg-slate-50/70"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">{index + 1}</span><span className="max-w-[180px] truncate font-bold text-slate-800">{customer.name || "Unnamed customer"}</span></div></td><td className="px-5 py-3.5 font-semibold text-slate-600">{numberFormat(customer.invoices)}</td><td className="px-5 py-3.5 font-extrabold text-slate-900">{formatCurrency(customer.sales)}</td><td className="px-5 py-3.5 font-bold text-amber-600">{formatCurrency(customer.outstanding)}</td></tr>)}</tbody>
            </table>
            {!topCustomers.length && <EmptyState>No customer sales were found for {reportMonthLabel}.</EmptyState>}
          </div>
        </Section>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
        <Section title="Sales Trend" description="Recent monthly sales for context; product and customer tables use the selected month." icon={BarChart3}>
          <div className="h-[290px] p-3 sm:h-[330px] sm:p-5">
            {mounted && monthlySales.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlySales} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={75}/><Tooltip formatter={moneyTooltip} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.08)" }}/><Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[6,6,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer> : <EmptyState>No sales trend yet.</EmptyState>}
          </div>
        </Section>

        <section className="relative isolate flex min-h-[290px] flex-col justify-between overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-lg shadow-slate-300/40 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 -z-10 size-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div>
            <div className="grid size-12 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-300"><RefreshCw size={21}/></div>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-300">Live overview</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Your business, at a glance.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Refresh to request the latest report data from your billing system. Sales and inventory figures depend on the data returned by your reports API.</p>
          </div>
          <Button className="mt-7 w-full" onClick={() => void load(selectedMonth || getCurrentMonthValue(), true)} disabled={refreshing || !selectedMonth}>
            <RefreshCw size={16} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
            {refreshing ? "Refreshing reports…" : "Refresh reports"}
          </Button>
        </section>
      </div>
    </div>
  );
}
