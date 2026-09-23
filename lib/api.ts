import type {
  Customer,
  Invoice,
  InvoiceDraft,
  Product,
  StockEntry,
  StockEntryDraft,
} from "@/types/billing";

const API_BASE_URL = "";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(!isFormData && init?.body ? { "Content-Type": "application/json" } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      // Fall back to HTTP status message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    return (await response.blob()) as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  customers: {
    list: () => request<Customer[]>("/api/customers"),
    getAll: () => request<Customer[]>("/api/customers"),
    get: (id: string | number) => request<Customer>(`/api/customers/${id}`),
    getById: (id: string | number) => request<Customer>(`/api/customers/${id}`),
    ledger: (id: string | number) => request<any>(`/api/customers/${id}/ledger`),
    create: (data: Partial<Customer>) =>
      request<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string | number, data: Partial<Customer>) =>
      request<Customer>(`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    remove: (id: string | number) =>
      request<void>(`/api/customers/${id}`, { method: "DELETE" }),
    delete: (id: string | number) =>
      request<void>(`/api/customers/${id}`, { method: "DELETE" }),
  },

  stockIn: {
  list: () =>
    request<StockEntry[]>("/api/stock-in"),

  create: (data: StockEntryDraft) =>
    request<StockEntry>("/api/stock-in", {
      method: "POST",
      body: JSON.stringify(data),
    }),
},

  products: {
    list: () => request<Product[]>("/api/products"),
    getAll: () => request<Product[]>("/api/products"),
    get: (id: string | number) => request<Product>(`/api/products/${id}`),
    getById: (id: string | number) => request<Product>(`/api/products/${id}`),
    create: (data: Partial<Product>) =>
      request<Product>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string | number, data: Partial<Product>) =>
      request<Product>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    remove: (id: string | number) =>
      request<void>(`/api/products/${id}`, { method: "DELETE" }),
    delete: (id: string | number) =>
      request<void>(`/api/products/${id}`, { method: "DELETE" }),
  },

  payments: {
    create: (data: { invoiceId: number; amount: number; paymentMode: "CASH" | "UPI" | "BANK_TRANSFER"; paymentDate?: string; referenceNumber?: string; notes?: string }) =>
      request<Invoice>("/api/payments", { method: "POST", body: JSON.stringify(data) }),
    invoiceHistory: (id: string | number) => request<any[]>(`/api/payments/invoice/${id}`),
  },

  dashboard: {
    analytics: () => request<any>("/api/dashboard/analytics"),
  },

  reports: {
    analytics: () => request<any>("/api/reports"),
  },

  settings: {
    get: () => request<any>("/api/settings"),
    update: (data: any) => request<any>("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
  },

   invoices: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      date?: string;
    }) => {
      const query = new URLSearchParams();

      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.search) query.set("search", params.search);
      if (params?.date) query.set("date", params.date);

      const queryString = query.toString();

      return request<{
        invoices: Invoice[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(
        `/api/invoices${queryString ? `?${queryString}` : ""}`
      );
    },

    getAll: () => request<Invoice[]>("/api/invoices"),

    get: (id: string | number) =>
      request<Invoice>(`/api/invoices/${id}`),

    getById: (id: string | number) =>
      request<Invoice>(`/api/invoices/${id}`),

    create: (data: InvoiceDraft) =>
      request<Invoice>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string | number, data: Partial<InvoiceDraft>) =>
      request<Invoice>(`/api/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    remove: (id: string | number) =>
      request<void>(`/api/invoices/${id}`, {
        method: "DELETE",
      }),

    delete: (id: string | number) =>
      request<void>(`/api/invoices/${id}`, {
        method: "DELETE",
      }),

    pdf: (id: string | number) =>
      request<Blob>(`/api/invoices/${id}/pdf`),

    downloadPdf: (id: string | number) =>
      request<Blob>(`/api/invoices/${id}/pdf`),
  },
  // baaki same...
};
