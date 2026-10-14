"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Boxes, IndianRupee, Users, AlertTriangle, ReceiptText, TrendingUp, Package } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
// import type { Product } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";


export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  // const [products, setProducts] = useState<Product[]>([]);
  // const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
 async function load() {
  try {
    setLoading(true);

    const analytics = await api.dashboard.analytics();

    setData(analytics);
    setError("");
  } catch (e) {
    setError(
      e instanceof Error
        ? e.message
        : "Could not load dashboard"
    );
  } finally {
    setLoading(false);
  }
}
  useEffect(()=>{load()},[]);
  if (loading) return <DashboardSkeleton />;;
  const t=data?.totals||{revenue:0,cost:0,profit:0,units:0,outstanding:0};
  const cm=data?.currentMonth||{revenue:0,units:0,profit:0};
  const low: Array<{
  id: string;
  name: string;
  sku?: string | null;
  stock: number;
}> = data?.lowStockProducts || [];
  
const cards = [
  {
    label: "This month revenue",
    value: formatCurrency(cm.revenue),
    Icon: IndianRupee,
    sub: `${Number(cm.units).toLocaleString("en-IN")} units sold this month`,
    iconStyle: "bg-blue-50 text-blue-700",
    accent: "bg-blue-500",
  },
  {
    label: "Total units sold",
    value: Number(t.units).toLocaleString("en-IN"),
    Icon: Package,
    sub: "All non-cancelled invoices",
    iconStyle: "bg-violet-50 text-violet-700",
    accent: "bg-violet-500",
  },
  {
    label: "Gross profit",
    value: formatCurrency(t.profit),
    Icon: TrendingUp,
    sub: "Revenue minus item cost",
    iconStyle: "bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-500",
  },
  {
    label: "Outstanding",
    value: formatCurrency(t.outstanding),
    Icon: ReceiptText,
    sub: "Unpaid and partially paid bills",
    iconStyle: "bg-amber-50 text-amber-700",
    accent: "bg-amber-500",
  },
];

  return <div className="fade-in"><PageHeader title="Dashboard" description="Real-time sales, inventory and profitability from MongoDB." actionHref="/invoices/new" actionLabel="Create invoice"/>
    
{error && (
  <div
    role="alert"
    className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <p className="text-sm font-bold text-rose-800">
        Could not load dashboard analytics
      </p>
      <p className="mt-1 text-sm text-rose-700">{error}</p>
    </div>

    <Button
      type="button"
      variant="secondary"
      onClick={load}
      disabled={loading}
    >
      Retry
    </Button>
  </div>
)}

   
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {cards.map((card) => {
    const Icon = card.Icon;

    return (
      <div
        key={card.label}
        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 ${card.accent}`}
        />

        <div className="flex items-center justify-between">
          <div
            className={`grid size-11 place-items-center rounded-2xl ${card.iconStyle}`}
          >
            <Icon size={21} />
          </div>

          <div className="grid size-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
            <ArrowUpRight size={17} />
          </div>
        </div>

        <p className="mt-5 break-words text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          {card.value}
        </p>

        <h2 className="mt-2 text-sm font-bold text-slate-700">
          {card.label}
        </h2>

        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {card.sub}
        </p>
      </div>
    );
  })}
</div>

    
<div className="mt-6 grid gap-5 xl:grid-cols-2">
  {/* Monthly Sales and Profit */}
  <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
          Monthly sales &amp; profit
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compare your revenue and gross profit month by month.
        </p>
      </div>

      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
        Monthly overview
      </span>
    </div>

    <div className="mt-6 h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data?.monthly || []}
          margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
          barGap={6}
        >
          <CartesianGrid
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickMargin={12}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            width={64}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value: number) =>
              value >= 1000
                ? `₹${(value / 1000).toLocaleString("en-IN", {
                    maximumFractionDigits: 1,
                  })}k`
                : `₹${value}`
            }
          />

          <Tooltip
            formatter={(value: any, name: any) => [
              formatCurrency(Number(value)),
              name,
            ]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
            cursor={{ fill: "#f8fafc" }}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />

          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#2563eb"
            radius={[5, 5, 0, 0]}
            maxBarSize={32}
          />

          <Bar
            dataKey="profit"
            name="Profit"
            fill="#10b981"
            radius={[5, 5, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>

  {/* Units Sold Trend */}
  <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-slate-900">
          Units sold trend
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Track the quantity invoiced over time.
        </p>
      </div>

      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
        Sales activity
      </span>
    </div>

    <div className="mt-6 h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data?.monthly || []}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickMargin={12}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            width={42}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value: number) =>
              Number(value).toLocaleString("en-IN")
            }
          />

          <Tooltip
            formatter={(value: any) => [
              Number(value).toLocaleString("en-IN"),
              "Units",
            ]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              fontSize: 12,
            }}
          />

          <Line
            type="monotone"
            dataKey="units"
            name="Units"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              fill: "#ffffff",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
</div>
<div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="card p-5">
        <div className="flex items-center justify-between"><div>
          <h2 className="font-black">Inventory attention</h2>
          <p className="text-xs text-slate-500">Items at or below 5 units.</p>
        </div><AlertTriangle size={18} className="text-amber-500"/></div>
        <div className="mt-4 space-y-3">{low.length?low.map(p=><div key={p.id} className="flex justify-between rounded-xl border border-slate-100 p-3"><div>
          <div className="font-bold">{p.name}</div>
          <div className="text-xs text-slate-500">{p.sku||"No SKU"}</div>
        </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{p.stock} left</div>
        </div>):<div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">No low-stock products.</div>}</div></section>
      <section className="card p-5">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="font-black">Workspace</h2>
      <p className="text-xs text-slate-500">
        {data?.counts?.customers ?? 0} customers ·{" "}
        {data?.counts?.products ?? 0} products
      </p>
    </div><Boxes size={18} className="text-slate-400"/>
      </div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button asChild variant="secondary">
        <Link href="/products">Manage inventory</Link></Button><Button asChild><Link href="/invoices">Open invoices</Link></Button></div>
      </section></div>
  </div>;
}
