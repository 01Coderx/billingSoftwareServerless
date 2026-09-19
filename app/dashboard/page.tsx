"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Boxes, IndianRupee, Users, AlertTriangle, ReceiptText, TrendingUp, Package } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/data-state";
import { PageHeader } from "@/components/page-header";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function Dashboard() {
  const [data, setData] = useState<any>(null); const [products, setProducts] = useState<Product[]>([]); const [customers, setCustomers] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { try { setLoading(true); const [analytics,p,c] = await Promise.all([api.dashboard.analytics(), api.products.list(), api.customers.list()]); setData(analytics); setProducts(p); setCustomers(c); setError(""); } catch(e) { setError(e instanceof Error ? e.message : "Could not load dashboard"); } finally { setLoading(false); } }
  useEffect(()=>{load()},[]);
  if (loading) return <LoadingState label="Loading live analytics…"/>;
  const t=data?.totals||{revenue:0,cost:0,profit:0,units:0,outstanding:0}; const cm=data?.currentMonth||{revenue:0,units:0,profit:0}; const low=products.filter(p=>Number(p.stock)<=5).slice(0,5);
  const cards=[
    ["This month revenue",formatCurrency(cm.revenue),IndianRupee,`${Number(cm.units).toLocaleString("en-IN")} units sold this month`],
    ["Total units sold",Number(t.units).toLocaleString("en-IN"),Package,"All non-cancelled invoices"],
    ["Gross profit",formatCurrency(t.profit),TrendingUp,"Revenue − item cost"],
    ["Outstanding",formatCurrency(t.outstanding),ReceiptText,"Unpaid + partial bills"],
  ];
  return <div className="fade-in"><PageHeader title="Dashboard" description="Real-time sales, inventory and profitability from MongoDB." actionHref="/invoices/new" actionLabel="Create invoice"/>
    {error&&<div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon,sub]:any)=><div className="card p-5" key={label}><div className="flex justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={20}/></div><ArrowUpRight size={17} className="text-slate-300"/></div><div className="mt-5 text-2xl font-black tracking-tight">{value}</div><div className="mt-1 text-sm font-bold text-slate-700">{label}</div><div className="mt-1 text-xs text-slate-500">{sub}</div></div>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2"><section className="card p-5"><div><h2 className="font-black">Monthly sales & profit</h2><p className="text-xs text-slate-500">Revenue, cost and gross profit by month.</p></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.monthly||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip formatter={(v:any)=>formatCurrency(Number(v))}/><Bar dataKey="revenue" name="Revenue" fill="#2563eb"/><Bar dataKey="profit" name="Profit" fill="#16a34a"/></BarChart></ResponsiveContainer></div></section>
    <section className="card p-5"><div><h2 className="font-black">Units sold trend</h2><p className="text-xs text-slate-500">Total quantities invoiced each month.</p></div><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.monthly||[]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip/><Line type="monotone" dataKey="units" name="Units" stroke="#7c3aed" strokeWidth={3}/></LineChart></ResponsiveContainer></div></section></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]"><section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Inventory attention</h2><p className="text-xs text-slate-500">Items at or below 5 units.</p></div><AlertTriangle size={18} className="text-amber-500"/></div><div className="mt-4 space-y-3">{low.length?low.map(p=><div key={p.id} className="flex justify-between rounded-xl border border-slate-100 p-3"><div><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.sku||"No SKU"}</div></div><div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{p.stock} left</div></div>):<div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">No low-stock products.</div>}</div></section><section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Workspace</h2><p className="text-xs text-slate-500">{customers.length} customers · {products.length} products</p></div><Boxes size={18} className="text-slate-400"/></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button asChild variant="secondary"><Link href="/products">Manage inventory</Link></Button><Button asChild><Link href="/invoices">Open invoices</Link></Button></div></section></div>
  </div>;
}
