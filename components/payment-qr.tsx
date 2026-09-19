"use client";

export function PaymentQR({ upiId, merchantName, amount, invoiceNumber }: { upiId: string; merchantName: string; amount: number; invoiceNumber: string }) {
  const params = new URLSearchParams({ pa: upiId, pn: merchantName, am: Number(amount || 0).toFixed(2), cu: "INR", tn: `Payment for ${invoiceNumber}` });
  const value = `upi://pay?${params.toString()}`;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(value)}`;
  if (!upiId || amount <= 0) return null;
  return <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3"><img src={src} alt={`UPI payment QR for ${invoiceNumber}`} width={180} height={180} className="rounded-lg" /><div className="text-center text-xs text-slate-500">Scan to pay <strong className="text-slate-700">₹{Number(amount).toFixed(2)}</strong></div></div>;
}
