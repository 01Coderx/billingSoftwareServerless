"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Invoice } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { label: "All bills", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Drafts", value: "DRAFT" },
] as const;

function InvoiceRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-5 md:grid-cols-[1.15fr_1.2fr_.95fr_1.1fr_.85fr_84px] md:items-center">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 max-w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-24" />
      <div className="flex justify-end gap-2">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
    </div>
  );
}

function isInvoiceOverdue(invoice: Invoice): boolean {
  if (
    !invoice.dueDate ||
    invoice.paymentStatus === "PAID" ||
    invoice.status === "CANCELLED" ||
    invoice.status === "DRAFT"
  ) {
    return false;
  }

  // Compare calendar days so an invoice is not marked overdue during its due date.
  const dueDateText = String(invoice.dueDate).slice(0, 10);
  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return /^\d{4}-\d{2}-\d{2}$/.test(dueDateText) && dueDateText < todayText;
}

function paymentStatusLabel(invoice: Invoice): string {
  if (invoice.status === "CANCELLED") return "Payment not applicable";
  if (invoice.status === "DRAFT") return "Not sent";

  switch (invoice.paymentStatus) {
    case "PAID":
      return "Fully paid";
    case "PARTIAL":
      return "Partially paid";
