"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

function money(value: number | null | undefined) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function date(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

export default function PrintInvoicePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const hasAutoPrinted = useRef(false);

  const doPrint = async () => {
  if (printing) return;
  setPrinting(true);

  if (typeof document !== "undefined" && document.fonts) {
    await withTimeout(document.fonts.ready, 1500);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));

  window.print();
  setPrinting(false);
};

useEffect(() => {
  if (!invoice || hasAutoPrinted.current) return;
  hasAutoPrinted.current = true;
  doPrint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [invoice]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.invoices
      .get(id)
      .then(setInvoice)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load invoice"));
  }, [id]);


  if (error) return <main className="p-8 font-sans text-red-600">{error}</main>;
  if (!invoice) return <main className="p-8 font-sans text-slate-500">Preparing bill…</main>;

  const customer = invoice.customer?.name || "Walk-in Customer";

  return (
    <>
     <style jsx global>{`
  @page {
    size: 100mm 148mm;
    margin: 0;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: white;
  }

  * {
    box-sizing: border-box;
  }

  .print-bill {
    width: 100mm;
    min-height: 148mm;
    height: 148mm;
    margin: 0 auto;
    padding: 3mm 3.5mm;
    color: #111;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7px;
    line-height: 1.15;
  }

  .title {
    display: none;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    margin-bottom: 2px;
    font-size: 7px;
    line-height: 1.1;
  }

  .customer {
    margin: 2px 0 4px;
    font-size: 8px;
    line-height: 1.15;
    font-weight: 800;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    border: 0.4px solid #444;
    padding: 2px 2px;
    vertical-align: middle;
    line-height: 1.1;
    overflow-wrap: break-word;
  }

  th {
    font-size: 7px !important;
    font-weight: 900;
    text-transform: uppercase;
  }

  td {
    font-size: 7px !important;
    font-weight: 600;
  }

  th:nth-child(1),
  td:nth-child(1) {
    width: 7%;
  }

  th:nth-child(2),
  td:nth-child(2) {
    width: 34%;
  }

  th:nth-child(3),
  td:nth-child(3) {
    width: 19%;
  }

  th:nth-child(4),
  td:nth-child(4) {
    width: 12%;
  }

  th:nth-child(5),
  td:nth-child(5) {
    width: 28%;
  }

  .right {
    text-align: right;
  }

  .center {
    text-align: center;
  }

  .totals {
    margin-top: 3px;
    margin-left: auto;
    width: 55%;
    font-size: 7px;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
  }

  .grand {
    border-top: 0.5px solid #111;
    margin-top: 1px;
    padding-top: 1px;
    font-size: 8px;
    font-weight: 900;
  }

  .footer {
    margin-top: auto;
    padding-top: 3px;
    text-align: center;
    font-size: 6px;
  }

  @media screen {
    body {
      background: #e5e7eb;
    }

    .print-bill {
      width: 100mm;
      height: 148mm;
      min-height: 148mm;
      margin: 10px auto;
      padding: 3mm 3.5mm;
      background: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.18);
    }
  }

  @media print {
    .no-print {
      display: none !important;
    }

    html,
    body {
      width: 100mm !important;
      height: 148mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .print-bill {
      width: 100mm !important;
      height: 148mm !important;
      min-height: 148mm !important;
      margin: 0 !important;
      padding: 3mm 3.5mm !important;
      box-shadow: none !important;
    }
  }
`}</style>
      
      {/* Manual print button to bypass browser auto-print blocks */}
      <div className="no-print p-4 flex justify-center gap-4 bg-slate-100 border-b">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded font-medium shadow hover:bg-blue-700 transition"
        >
          Print Invoice
        </button>
      </div>

      <main className="print-bill">
        <div className="title">BILL</div>

        <div className="meta">
          <strong>Invoice: {invoice.invoiceNumber}</strong>
          <span>Date: {date(invoice.createdAt)}</span>
        </div>

        <div className="customer">
          Customer: {customer}
          {invoice.customer?.phone ? ` | ${invoice.customer.phone}` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th className="center">#</th>
              <th>Item</th>
              <th className="right">Rate</th>
              <th className="right">Qty</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, index) => (
              <tr key={item.id ?? `${item.product?.id}-${index}`}>
                <td className="center">{index + 1}</td>
                <td>{item.product?.name || "Item"}</td>
                <td className="right">{money(item.rate)}</td>
                <td className="right">{item.quantity}</td>
                <td className="right">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <strong>{money(invoice.subtotal)}</strong>
          </div>

          {Number(invoice.tax || 0) !== 0 && (
            <div className="total-row">
              <span>Tax</span>
              <strong>{money(invoice.tax)}</strong>
            </div>
          )}

          {Number(invoice.discount || 0) !== 0 && (
            <div className="total-row">
              <span>Discount</span>
              <strong>-{money(invoice.discount)}</strong>
            </div>
          )}

          <div className="total-row grand">
            <span>TOTAL</span>
            <strong>{money(invoice.total)}</strong>
          </div>
        </div>

        <div className="footer">Thank you for your business.</div>
      </main>
    </>
  );
}
