"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Mail, Printer, Pencil, Trash2, Wallet, MessageCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { PaymentQR } from "@/components/payment-qr";


function esc(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function receiptSvg(invoice: Invoice, settings: any) {
  const width = 1000;
  const rowH = 82;
  const items = invoice.items || [];
  const baseHeight = 980;
  const height = Math.max(1480, baseHeight + items.length * rowH);
  const business = settings?.businessName || "BILL / RECEIPT";
  const customer = invoice.customer?.name || "Walk-in Customer";
  const phone = invoice.customer?.phone || "";
  let y = 350;
  const rows = items.map((item, index) => {
    const yy = y + index * rowH;
    return `<rect x="60" y="${yy}" width="880" height="${rowH}" fill="white" stroke="#111827" stroke-width="2"/>
      <text x="82" y="${yy + 50}" font-size="26" font-family="Arial, Helvetica, sans-serif">${index + 1}</text>
      <text x="135" y="${yy + 38}" font-size="27" font-weight="700" font-family="Arial, Helvetica, sans-serif">${esc(item.product?.name || "Item")}</text>
      <text x="135" y="${yy + 64}" font-size="18" fill="#64748b" font-family="Arial, Helvetica, sans-serif">${esc(item.product?.sku || "")}</text>
      <text x="620" y="${yy + 50}" font-size="25" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${esc(money(item.rate))}</text>
      <text x="745" y="${yy + 50}" font-size="25" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${esc(item.quantity)}</text>
      <text x="920" y="${yy + 50}" font-size="26" font-weight="700" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${esc(money(item.amount))}</text>`;
  }).join("");
  y += items.length * rowH;
  const totalsY = y + 65;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="white"/>
    <text x="500" y="70" text-anchor="middle" font-size="42" font-weight="900" font-family="Arial, Helvetica, sans-serif">${esc(business)}</text>
    <text x="60" y="125" font-size="25" font-weight="700" font-family="Arial, Helvetica, sans-serif">Invoice: ${esc(invoice.invoiceNumber)}</text>
    <text x="940" y="125" text-anchor="end" font-size="22" font-family="Arial, Helvetica, sans-serif">Date: ${esc(invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : "-")}</text>
    <text x="60" y="190" font-size="28" font-weight="800" font-family="Arial, Helvetica, sans-serif">Customer: ${esc(customer)}</text>
    ${phone ? `<text x="60" y="225" font-size="22" fill="#475569" font-family="Arial, Helvetica, sans-serif">${esc(phone)}</text>` : ""}
    <rect x="60" y="270" width="880" height="80" fill="#f8fafc" stroke="#111827" stroke-width="2"/>
    <text x="82" y="320" font-size="23" font-weight="800" font-family="Arial, Helvetica, sans-serif">#</text>
    <text x="135" y="320" font-size="23" font-weight="800" font-family="Arial, Helvetica, sans-serif">ITEM</text>
    <text x="620" y="320" text-anchor="end" font-size="23" font-weight="800" font-family="Arial, Helvetica, sans-serif">RATE</text>
    <text x="745" y="320" text-anchor="end" font-size="23" font-weight="800" font-family="Arial, Helvetica, sans-serif">QTY</text>
    <text x="920" y="320" text-anchor="end" font-size="23" font-weight="800" font-family="Arial, Helvetica, sans-serif">AMOUNT</text>
    ${rows}
    <g font-family="Arial, Helvetica, sans-serif" font-size="24">
      <text x="650" y="${totalsY}">Subtotal</text><text x="920" y="${totalsY}" text-anchor="end" font-weight="700">${esc(money(invoice.subtotal))}</text>
      <text x="650" y="${totalsY + 42}">Tax</text><text x="920" y="${totalsY + 42}" text-anchor="end" font-weight="700">${esc(money(invoice.tax))}</text>
      <text x="650" y="${totalsY + 84}">Discount</text><text x="920" y="${totalsY + 84}" text-anchor="end" font-weight="700">-${esc(money(invoice.discount))}</text>
      <line x1="640" y1="${totalsY + 110}" x2="920" y2="${totalsY + 110}" stroke="#111827" stroke-width="3"/>
      <text x="650" y="${totalsY + 155}" font-size="30" font-weight="900">TOTAL</text><text x="920" y="${totalsY + 155}" text-anchor="end" font-size="30" font-weight="900">${esc(money(invoice.total))}</text>
      <text x="650" y="${totalsY + 202}" fill="#047857" font-weight="800">PAID</text><text x="920" y="${totalsY + 202}" text-anchor="end" fill="#047857" font-weight="800">${esc(money(invoice.amountPaid))}</text>
      <text x="650" y="${totalsY + 244}" fill="#dc2626" font-weight="900">DUE</text><text x="920" y="${totalsY + 244}" text-anchor="end" fill="#dc2626" font-weight="900">${esc(money(invoice.amountDue))}</text>
    </g>
    <text x="500" y="${height - 55}" text-anchor="middle" font-size="20" fill="#64748b" font-family="Arial, Helvetica, sans-serif">${esc(settings?.phone ? `${settings.phone} · ` : "")}Thank you for your business.</text>
  </svg>`;
}

async function invoiceToPng(invoice: Invoice, settings: any) {
  const svg = receiptSvg(invoice, settings);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not render bill image")); image.src = url; });
    const scale = 1.5;
    const canvas = document.createElement("canvas");
    canvas.width = 1000 * scale;
    canvas.height = (image.height || 1480) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create bill image");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not create PNG")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export default function InvoiceDetail(){
 const params=useParams<{id:string}>(); const id=Number(params.id); const [invoice,setInvoice]=useState<Invoice|null>(null); const [payments,setPayments]=useState<any[]>([]); const [settings,setSettings]=useState<any>({}); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [saving,setSaving]=useState(false); const [downloading,setDownloading]=useState(false); const [deleting,setDeleting]=useState(false); const [amount,setAmount]=useState(""); const [mode,setMode]=useState("CASH"); const [reference,setReference]=useState("");
 async function load(){try{const [i,p,s]=await Promise.all([api.invoices.get(id),api.payments.invoiceHistory(id),api.settings.get()]);setInvoice(i);setPayments(p||[]);setSettings(s||{});setAmount(Number(i.amountDue||0)>0?String(i.amountDue):"")}catch(e){setError(e instanceof Error?e.message:"Could not load invoice")}finally{setLoading(false)}}
 useEffect(()=>{if(Number.isFinite(id))load()},[id]);
 async function recordPayment(e:React.FormEvent){e.preventDefault();if(!invoice)return;setSaving(true);setError("");try{const updated=await api.payments.create({invoiceId:invoice.id,amount:Number(amount),paymentMode:mode as any,referenceNumber:reference});setInvoice(updated);setPayments(await api.payments.invoiceHistory(id));setAmount(Number(updated.amountDue||0)>0?String(updated.amountDue):"");setReference("")}catch(e){setError(e instanceof Error?e.message:"Could not record payment")}finally{setSaving(false)}}
 async function whatsapp(){
  if(!invoice)return;
  setError("");
  try{
    const image=await invoiceToPng(invoice,settings);
    const file=new File([image],`bill-${invoice.invoiceNumber}.png`,{type:"image/png"});
    const message=`Hello,\n\nYour invoice ${invoice.invoiceNumber} is ready.\nOutstanding amount: ₹${Number(invoice.amountDue||0).toFixed(2)}\n\nThank you.`;
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      await navigator.share({title:`Invoice ${invoice.invoiceNumber}`,text:message,files:[file]});
      return;
    }
    const url=URL.createObjectURL(image);
    const a=document.createElement("a");a.href=url;a.download=`bill-${invoice.invoiceNumber}.png`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    if(invoice.customer?.phone){
      const clean=invoice.customer.phone.replace(/\D/g,"");
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`,"_blank");
    }else{
      window.open("https://web.whatsapp.com/","_blank");
      setError("Bill image downloaded. Attach the PNG in WhatsApp Web to send it.");
    }
  }catch(e){
    if(e instanceof DOMException && e.name==="AbortError")return;
    setError(e instanceof Error?e.message:"Could not prepare bill image for WhatsApp");
  }
}
 async function download(){if(!invoice)return;setDownloading(true);try{const blob=await api.invoices.pdf(invoice.id);const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`invoice-${invoice.id}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e instanceof Error?e.message:"Could not download PDF")}finally{setDownloading(false)}}
 async function remove(){if(!invoice||!confirm("Delete this bill permanently? Stock for this invoice will be restored."))return;setDeleting(true);try{await api.invoices.remove(invoice.id);location.href="/invoices"}catch(e){setError(e instanceof Error?e.message:"Could not delete invoice")}finally{setDeleting(false)}}
 if(loading)return <div className="card p-8 text-sm text-slate-500">Loading invoice…</div>;
 if(!invoice)return <div><Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft size={16}/>Back</Link><div className="mt-5 card p-8 text-rose-600">{error||"Invoice not found."}</div></div>;
 return <div className="fade-in"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={16}/>Back to bills</Link><div className="flex flex-wrap gap-2"><Button asChild variant="secondary"><Link href={`/invoices/${invoice.id}/edit`}><Pencil size={16}/>Edit</Link></Button><Button onClick={()=>location.href=`/invoices/${invoice.id}/print`}><Printer size={16}/>Print</Button><Button onClick={download} disabled={downloading} variant="secondary"><Download size={16}/>{downloading?"Preparing…":"PDF"}</Button><Button onClick={whatsapp} variant="secondary"><MessageCircle size={16}/>WhatsApp</Button><Button onClick={remove} disabled={deleting} variant="secondary" className="text-rose-600"><Trash2 size={16}/></Button></div></div>
 {error&&<div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
 <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="card overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><FileText size={22}/></div><div><div className="text-xs font-black uppercase tracking-wider text-blue-600">Invoice</div><h1 className="mt-1 text-2xl font-black">{invoice.invoiceNumber}</h1><div className="mt-1 text-xs text-slate-500">Created {formatDate(invoice.createdAt)}</div></div></div><StatusBadge status={invoice.paymentStatus||invoice.status}/></div>
 <div className="grid gap-5 border-b border-slate-100 p-6 sm:grid-cols-2"><div><div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Bill to</div><div className="mt-3 flex items-start gap-3"><div className="grid size-10 place-items-center rounded-full bg-slate-100 font-black">{initials(invoice.customer?.name||"Walk-in")}</div><div><div className="font-black">{invoice.customer?.name||"Walk-in customer"}</div>{invoice.customer?.email&&<div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail size={13}/>{invoice.customer.email}</div>}{invoice.customer?.phone&&<div className="mt-1 text-xs text-slate-500">{invoice.customer.phone}</div>}</div></div></div><div className="sm:text-right"><div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Due date</div><div className="mt-3 font-black">{formatDate(invoice.dueDate)}</div></div></div>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 text-left text-[11px] font-black uppercase tracking-wider text-slate-400"><th className="px-6 py-3">Item</th><th className="px-6 py-3 text-right">Rate</th><th className="px-6 py-3 text-right">Qty</th><th className="px-6 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{invoice.items?.map(item=><tr key={item.id}><td className="px-6 py-4"><div className="font-bold">{item.product?.name}</div><div className="text-xs text-slate-400">{item.product?.sku}</div></td><td className="px-6 py-4 text-right">{formatCurrency(item.rate)}</td><td className="px-6 py-4 text-right font-bold">{item.quantity}</td><td className="px-6 py-4 text-right font-black">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>
 <div className="ml-auto max-w-sm space-y-3 p-6"><div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><strong>{formatCurrency(invoice.subtotal)}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><strong>{formatCurrency(invoice.tax)}</strong></div><div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><strong>-{formatCurrency(invoice.discount)}</strong></div><div className="flex justify-between border-t pt-4"><span className="font-black">Total</span><strong className="text-2xl font-black">{formatCurrency(invoice.total)}</strong></div><div className="flex justify-between text-sm"><span className="text-emerald-600 font-bold">Paid</span><strong className="text-emerald-700">{formatCurrency(invoice.amountPaid)}</strong></div><div className="flex justify-between"><span className="font-black text-rose-600">Outstanding</span><strong className="text-xl font-black text-rose-600">{formatCurrency(invoice.amountDue)}</strong></div></div></section>
 <aside className="space-y-5"><section className="card p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet size={18}/></div><div><h2 className="font-black">Record payment</h2><p className="text-xs text-slate-500">Partial and multiple payments supported.</p></div></div><form onSubmit={recordPayment} className="mt-5 space-y-3"><label className="block text-sm font-bold">Amount<input className="input mt-1.5" type="number" min="0.01" step="0.01" max={invoice.amountDue||0} value={amount} onChange={e=>setAmount(e.target.value)} disabled={!invoice.amountDue}/></label><label className="block text-sm font-bold">Payment mode<select className="input mt-1.5" value={mode} onChange={e=>setMode(e.target.value)}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank Transfer</option></select></label><label className="block text-sm font-bold">Reference<input className="input mt-1.5" placeholder="Optional UTR / reference" value={reference} onChange={e=>setReference(e.target.value)}/></label><Button className="w-full" disabled={saving||!invoice.amountDue}>{saving?"Recording…":invoice.amountDue?"Record payment":"Fully paid"}</Button></form></section>
 <section className="card p-5"><h2 className="font-black">Payment QR</h2><p className="mt-1 text-xs text-slate-500">QR uses the exact outstanding amount.</p><div className="mt-4 flex justify-center"><PaymentQR upiId={settings.upiId||""} merchantName={settings.businessName||"Merchant"} amount={Number(invoice.amountDue||0)} invoiceNumber={invoice.invoiceNumber}/></div>{!settings.upiId&&<div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">Add your UPI ID in Settings to show the payment QR.</div>}</section>
 <section className="card p-5"><h2 className="font-black">Payment history</h2><div className="mt-4 space-y-3">{payments.length?payments.map(p=><div key={p.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between"><strong>{formatCurrency(p.amount)}</strong><span className="text-xs font-bold text-slate-500">{p.paymentMode.replace("_"," ")}</span></div><div className="mt-1 text-xs text-slate-400">{formatDate(p.paymentDate)}{p.referenceNumber?` · ${p.referenceNumber}`:""}</div></div>):<div className="text-sm text-slate-400">No payments recorded yet.</div>}</div></section></aside></div></div>
}
