"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function date(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
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

  useEffect(() => {
    if (!Number.isFinite(id)) return;

    api.invoices
      .get(id)
      .then(setInvoice)
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "Could not load invoice"
        )
      );
  }, [id]);

  const printBill = () => {
    window.print();
  };

  if (error) {
    return (
      <main className="p-8 font-sans text-red-600">
        {error}
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="p-8 font-sans text-slate-500">
        Preparing bill…
      </main>
    );
  }

  const customer =
    invoice.customer?.name || "Walk-in Customer";

  const phone = invoice.customer?.phone || "";

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
          background: white !important;
        }

        * {
          box-sizing: border-box;
        }

        .print-actions {
          display: flex;
          justify-content: center;
          padding: 12px;
          background: #f1f5f9;
        }

        .print-actions button {
          border: 0;
          border-radius: 6px;
          padding: 9px 18px;
          background: #2563eb;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .bill-page {
          width: 100mm;
          height: 148mm;
          min-height: 148mm;
          margin: 0 auto;
          padding: 9pt 10pt;
          background: white;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          overflow: hidden;
        }

        .invoice-line {
          width: 100%;
          font-size: 7pt;
          font-weight: 700;
          line-height: 1;
        }

        .date-line {
          width: 100%;
          margin-top: 1pt;
          font-size: 5.8pt;
          line-height: 1;
          text-align: right;
          font-weight: 400;
        }

        .customer-line {
          margin-top: 3pt;
          margin-bottom: 3pt;
          font-size: 8pt;
          line-height: 1.05;
          font-weight: 700;
          white-space: nowrap;
        }

        .customer-name {
          font-size: 9pt;
          font-weight: 700;
        }

        .customer-phone {
          font-size: 7pt;
          font-weight: 400;
        }

        .bill-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          border-spacing: 0;
        }

        .bill-table th,
        .bill-table td {
          width: auto;
          height: 15pt;
          padding: 0 2pt;
          border: 1px solid #111;
          vertical-align: middle;
          line-height: 1;
          overflow: hidden;
          white-space: nowrap;
        }

        .bill-table th {
          font-size: 7.5pt;
          font-weight: 700;
        }

        .bill-table td {
          font-size: 7pt;
          font-weight: 400;
        }

        .bill-table th:nth-child(1),
        .bill-table td:nth-child(1) {
          width: 13pt;
          text-align: right;
        }

        .bill-table th:nth-child(2),
        .bill-table td:nth-child(2) {
          width: 65pt;
          text-align: left;
        }

        .bill-table th:nth-child(3),
        .bill-table td:nth-child(3) {
          width: 35pt;
          text-align: right;
        }

        .bill-table th:nth-child(4),
        .bill-table td:nth-child(4) {
          width: 25pt;
          text-align: right;
        }

        .bill-table th:nth-child(5),
        .bill-table td:nth-child(5) {
          text-align: right;
        }

        .summary {
          width: 100%;
          margin-top: 5pt;
          text-align: right;
          font-size: 7pt;
          line-height: 1.15;
        }

        .summary-row {
          margin-bottom: 4pt;
        }

        .summary-total {
          font-size: 8.5pt;
          font-weight: 700;
        }

        .footer {
          position: absolute;
          top: 126mm;
          width: 92.6mm;
          text-align: center;
          font-size: 5.8pt;
          font-weight: 400;
        }

        @media screen {
          body {
            background: #e5e7eb !important;
          }

          .bill-page {
            margin: 20px auto;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
          }
        }

        @media print {
          .print-actions {
            display: none !important;
          }

          html,
          body {
            width: 100mm !important;
            height: 148mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          .bill-page {
            width: 100mm !important;
            height: 148mm !important;
            min-height: 148mm !important;
            margin: 0 !important;
            padding: 9pt 10pt !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="print-actions">
        <button onClick={printBill}>
          Print Bill
        </button>
      </div>

      <main className="bill-page">
        <div className="invoice-line">
          Invoice: {invoice.invoiceNumber}
        </div>

        <div className="date-line">
          Date: {date(invoice.createdAt)}
        </div>

        <div className="customer-line">
          Customer:{" "}
          <span className="customer-name">
            {customer}
          </span>

          {phone && (
            <span className="customer-phone">
              {"  |  "}
              {phone}
            </span>
          )}
        </div>

        <table className="bill-table">
          <colgroup>
            <col style={{ width: "13pt" }} />
            <col style={{ width: "65pt" }} />
            <col style={{ width: "35pt" }} />
            <col style={{ width: "25pt" }} />
            <col />
          </colgroup>

          <thead>
            <tr>
              <th>#</th>
              <th>ITEM</th>
              <th>RATE</th>
              <th>QTY</th>
              <th>AMOUNT</th>
            </tr>
          </thead>

          <tbody>
            {(invoice.items || []).map((item, index) => (
              <tr
                key={
                  item.id ??
                  `${item.product?.id}-${index}`
                }
              >
                <td>{index + 1}</td>

                <td title={item.product?.name || "Item"}>
                  {item.product?.name || "Item"}
                </td>

                <td>{money(item.rate)}</td>

                <td>{item.quantity}</td>

                <td>{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary">
          <div className="summary-row">
            Subtotal&nbsp;&nbsp;{money(invoice.subtotal)}
          </div>

          {Number(invoice.tax || 0) !== 0 && (
            <div className="summary-row">
              Tax&nbsp;&nbsp;{money(invoice.tax)}
            </div>
          )}

          {Number(invoice.discount || 0) !== 0 && (
            <div className="summary-row">
              Discount&nbsp;&nbsp;-
              {money(invoice.discount)}
            </div>
          )}

          <div className="summary-total">
            TOTAL&nbsp;&nbsp;{money(invoice.total)}
          </div>
        </div>

        <div className="footer">
          Thank you for your business.
        </div>
      </main>
    </>
  );
}
