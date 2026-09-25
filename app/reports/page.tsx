"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  IndianRupee,
  PackageCheck,
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

function MetricCard({ label, value, sub, icon: Icon, tone = "blue" }: any) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={20} /></div>
        <ArrowUpRight size={17} className="text-slate-300" />
      </div>
      <div className="mt-5 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-sm font-bold text-slate-700">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Section({ title, description, icon: Icon, children, action }: any) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={18} /></div>
          <div>
            <h2 className="font-black text-slate-950">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function load(showRefresh = false) {
    try {
      showRefresh ? setRefreshing(true) : setLoading(true);
      const result = await api.reports.analytics();
      
      // Fix 1: Response data wrapper extract karna agar API { success: true, data: {...} } de rahi ho
      const payload = result?.data ?? result;
      
      setData(payload);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const customerMix = useMemo(() => {
    const c = data?.customerAnalysis;
    return [
      { name: "Recurring", value: Number(c?.recurringCustomers || 0) },
      { name: "One-time", value: Number(c?.oneTimeCustomers || 0) },
    ];
  }, [data]);

  if (loading) return <LoadingState label="Loading live reports…" />;

  // Data Extraction with Safe Fallbacks
  const products = data?.productAnalysis || {};
  const customers = data?.customerAnalysis || {};

  // Fix 2: Field name Mismatches ko Normalise karna
  const rawTopProducts = Array.isArray(data?.topProducts) ? data.topProducts : [];
  const topProducts = rawTopProducts.map((p: any) => ({
    ...p,
    sales: Number(p.sales ?? p.totalSales ?? p.amount ?? 0),
    profit: Number(p.profit ?? p.totalProfit ?? 0),
    units: Number(p.units ?? p.quantity ?? p.totalQuantity ?? 0),
  }));

  const rawTopCustomers = Array.isArray(data?.topCustomers) ? data.topCustomers : [];
  const topCustomers = rawTopCustomers.map((c: any) => ({
    ...c,
    sales: Number(c.sales ?? c.totalSales ?? c.amount ?? 0),
    outstanding: Number(c.outstanding ?? c.due ?? c.balance ?? 0),
    invoices: Number(c.invoices ?? c.totalInvoices ?? c.invoiceCount ?? 0),
  }));

  const recurring = Array.isArray(data?.recurringCustomers)
    ? data.recurringCustomers
    : Array.isArray(data?.recurring)
    ? data.recurring
    : [];

  const lowStock = Array.isArray(data?.lowStockProducts)
    ? data.lowStockProducts
    : Array.isArray(data?.lowStock)
    ? data.lowStock
    : [];

  const monthlySales = Array.isArray(data?.monthlySales) ? data.monthlySales : [];

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="System"
        title="Reports & Analysis"
        description="Understand product sales, customer behaviour and inventory from your live billing data."
        actionHref="/invoices/new"
        actionLabel="Create invoice"
      />

      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => load(true)}>Retry</Button>
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={Number(products.products || products.totalProducts || 0).toLocaleString("en-IN")} sub={`${Number(products.unitsInStock || products.totalStock || 0).toLocaleString("en-IN")} units in stock`} icon={Boxes} />
        <MetricCard label="Inventory value" value={formatCurrency(products.inventoryValue || products.totalValue || 0)} sub="Cost value of current stock" icon={IndianRupee} tone="emerald" />
        <MetricCard label="Recurring customers" value={Number(customers.recurringCustomers || 0).toLocaleString("en-IN")} sub={`${Number(customers.customers || customers.totalCustomers || 0).toLocaleString("en-IN")} customers with sales`} icon={UserRoundCheck} tone="violet" />
        <MetricCard label="Products to restock" value={Number(products.lowStock || products.lowStockCount || 0).toLocaleString("en-IN")} sub={`At or below ${products.lowStockThreshold ?? 5} units`} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.9fr]">
        <Section title="Product Analysis" description="Sales and profit generated by individual products." icon={BarChart3} action={<Link className="text-xs font-bold text-blue-600 hover:text-blue-700" href="/products">Manage products →</Link>}>
          <div className="h-[360px] min-h-[360px] p-4 sm:p-5">
            {mounted && topProducts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 12, right: 18, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={moneyTooltip} />
                  <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="grid h-full place-items-center text-sm text-slate-500">No invoice product data yet.</div>}
          </div>
        </Section>

        <Section title="Inventory Snapshot" description="Products that need attention." icon={PackageCheck} action={<span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">Target: {products.targetStock ?? 10}</span>}>
          <div className="p-5">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">Units left</div><div className="mt-1 text-xl font-black">{Number(products.unitsInStock || products.totalStock || 0).toLocaleString("en-IN")}</div></div>
              <div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs font-bold text-amber-700">Need restock</div><div className="mt-1 text-xl font-black text-amber-800">{Number(products.lowStock || 0)}</div></div>
            </div>
            <div className="space-y-2">
              {lowStock.length ? lowStock.map((product: any) => (
                <div key={product.id || product._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0"><div className="truncate text-sm font-bold">{product.name}</div><div className="text-[11px] text-slate-500">{product.sku || "No SKU"}</div></div>
                  <div className="shrink-0 text-right"><div className="text-xs font-black text-rose-600">{product.stock ?? product.quantity} left</div><div className="text-[10px] font-bold text-slate-400">{product.required ?? 0} required</div></div>
                </div>
              )) : <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Inventory is healthy. No products are at the restock threshold.</div>}
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section title="Top Products by Sales" description="Highest revenue-generating products across non-cancelled invoices." icon={ShoppingCart}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Units</th><th className="px-5 py-3">Sales</th><th className="px-5 py-3">Profit</th></tr></thead>
              <tbody>{topProducts.map((product: any, index: number) => <tr key={product.id || product._id || index} className="border-t border-slate-100"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-xs font-black">{index + 1}</span><div><div className="font-bold">{product.name}</div><div className="text-[11px] text-slate-500">{product.sku || "No SKU"}</div></div></div></td><td className="px-5 py-3 font-semibold">{Number(product.units).toLocaleString("en-IN")}</td><td className="px-5 py-3 font-black">{formatCurrency(product.sales)}</td><td className="px-5 py-3 font-bold text-emerald-600">{formatCurrency(product.profit)}</td></tr>)}</tbody>
            </table>
            {!topProducts.length && <div className="p-8 text-center text-sm text-slate-500">No product sales yet.</div>}
          </div>
        </Section>

        <Section title="Customer Analysis" description="Customer sales, repeat behaviour and outstanding amounts." icon={Users}>
          <div className="grid gap-5 p-5 sm:grid-cols-[150px_1fr] sm:items-center">
            <div className="h-36">
              {mounted && customers.customers ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={customerMix} dataKey="value" nameKey="name" innerRadius={42} outerRadius={60} paddingAngle={4}>{customerMix.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#2563eb" : "#cbd5e1"} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-slate-400">No data</div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-blue-50 p-4"><div className="text-xs font-bold text-blue-700">Total customers</div><div className="mt-1 text-xl font-black text-blue-950">{Number(customers.customers || customers.totalCustomers || 0)}</div></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold text-emerald-700">Customer sales</div><div className="mt-1 text-xl font-black text-emerald-950">{formatCurrency(customers.sales || customers.totalSales || 0)}</div></div>
              <div className="rounded-2xl bg-violet-50 p-4"><div className="text-xs font-bold text-violet-700">Recurring</div><div className="mt-1 text-xl font-black text-violet-950">{Number(customers.recurringCustomers || 0)}</div></div>
              <div className="rounded-2xl bg-amber-50 p-4"><div className="text-xs font-bold text-amber-700">Outstanding</div><div className="mt-1 text-xl font-black text-amber-950">{formatCurrency(customers.outstanding || customers.due || 0)}</div></div>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section title="Recurring Customers" description="Customers with two or more non-cancelled invoices." icon={UserRoundCheck} action={<span className="text-xs font-bold text-slate-500">{recurring.length} shown</span>}>
          <div className="divide-y divide-slate-100">
            {recurring.length ? recurring.map((customer: any) => (
              <div key={customer.id || customer._id} className="flex items-center justify-between gap-4 p-4 sm:px-5"><div className="min-w-0"><div className="truncate font-bold">{customer.name}</div><div className="text-xs text-slate-500">{customer.invoices ?? customer.invoiceCount} invoices · {customer.phone || customer.email || "No contact"}</div></div><div className="shrink-0 text-right"><div className="font-black">{formatCurrency(customer.sales ?? customer.totalSales ?? 0)}</div><div className="text-[11px] text-slate-500">total sales</div></div></div>
            )) : <div className="p-8 text-center text-sm text-slate-500">No recurring customers yet.</div>}
          </div>
        </Section>

        <Section title="Top Customers by Sales" description="Customers ranked by total sales value." icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Invoices</th><th className="px-5 py-3">Sales</th><th className="px-5 py-3">Due</th></tr></thead>
              <tbody>{topCustomers.map((customer: any, index: number) => <tr key={customer.id || customer._id || index} className="border-t border-slate-100"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-xs font-black">{index + 1}</span><span className="font-bold">{customer.name}</span></div></td><td className="px-5 py-3 font-semibold">{customer.invoices}</td><td className="px-5 py-3 font-black">{formatCurrency(customer.sales)}</td><td className="px-5 py-3 font-bold text-amber-600">{formatCurrency(customer.outstanding)}</td></tr>)}</tbody>
            </table>
            {!topCustomers.length && <div className="p-8 text-center text-sm text-slate-500">No customer sales yet.</div>}
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Section title="Sales Trend" description="Monthly invoice sales from your live database." icon={BarChart3}>
          <div className="h-[300px] min-h-[300px] p-4 sm:p-5">
            {mounted && monthlySales.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlySales}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} /><Tooltip formatter={moneyTooltip}/><Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-500">No sales trend yet.</div>}
          </div>
        </Section>
        <div className="card flex flex-col justify-between bg-slate-950 p-6 text-white">
          <div><div className="grid size-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><RefreshCw size={20}/></div><h2 className="mt-5 text-xl font-black">Reports stay live</h2><p className="mt-2 text-sm leading-6 text-slate-400">Every report is calculated from the current MongoDB invoices, products and customer snapshots.</p></div>
          <Button className="mt-7 w-full" onClick={() => load(true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh reports"}</Button>
        </div>
      </div>
    </div>
  );
}
