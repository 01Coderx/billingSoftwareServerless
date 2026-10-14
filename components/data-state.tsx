
import type { ReactNode } from "react";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="space-y-6"
    >
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="card space-y-4 p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="card space-y-5 p-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>

            <div className="flex h-56 items-end gap-3 pt-4">
              {[42, 68, 50, 85, 60, 95, 72, 48, 78, 58, 88, 65].map(
                (height, index) => (
                  <Skeleton
                    key={index}
                    className="flex-1 rounded-t-md rounded-b-none"
                  />
                )
              )}
            </div>

            <div className="flex justify-between gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-8" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Inventory and workspace */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((section) => (
          <div key={section} className="card space-y-5 p-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>

            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <span className="sr-only">Loading dashboard data…</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading table"
      className="card overflow-hidden"
    >
      {/* Table header */}
      <div className="hidden grid-cols-5 gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-20" />
        ))}
      </div>

      {/* Table rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 px-4 py-4 sm:px-5"
          >
            <Skeleton className="size-10 shrink-0 rounded-xl" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>

            <div className="hidden w-24 space-y-2 sm:block">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>

            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
            <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading table data…</span>
    </div>
  );
}

export function LoadingState({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div role="status" className="card grid min-h-40 place-items-center p-6">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span className="size-2 animate-pulse rounded-full bg-blue-500" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <span aria-hidden="true" className="text-2xl">
            —
          </span>
        </div>

        <h2 className="text-lg font-bold text-slate-900">{title}</h2>

        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>

        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
