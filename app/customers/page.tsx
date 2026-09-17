"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Customer } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/data-state";
import { initials } from "@/lib/utils";

const empty: Customer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<Customer>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.customers
      .list()
      .then(setCustomers)
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "Could not load customers"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.email} ${c.phone}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [customers, search]
  );

  function startEdit(customer: Customer) {
    if (!customer.id) return;

    setEditingId(customer.id);

    setForm({
      id: customer.id,
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });

    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty);
    setError("");
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const data = {
        name: form.name,
        email: form.email || "",
        phone: form.phone || "",
        address: form.address || "",
      };

      if (editingId !== null) {
        const updated = await api.customers.update(
          editingId,
          data
        );

        setCustomers((current) =>
          current.map((customer) =>
            customer.id === editingId ? updated : customer
          )
        );

        setEditingId(null);
        setForm(empty);
      } else {
        const created = await api.customers.create(data);

        setCustomers((current) => [created, ...current]);
        setForm(empty);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : editingId !== null
            ? "Could not update customer"
            : "Could not create customer"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading customer directory…" />;
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Directory"
        title="Customers"
        description="Maintain contacts that can be attached to invoices."
      />

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_350px]">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                className="input pl-10"
                placeholder="Search customers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center text-sm font-bold text-slate-500">
              {filtered.length} customers
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-slate-700">
                  {initials(c.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-black">{c.name}</div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail size={13} />
                      {c.email || "No email"}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Phone size={13} />
                      {c.phone || "No phone"}
                    </span>
                  </div>

                  {c.address && (
                    <div className="mt-1 truncate text-xs text-slate-400">
                      {c.address}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="btn btn-ghost !p-2 text-blue-500 hover:bg-blue-50"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil size={17} />
                </button>
              </div>
            ))}

            {!filtered.length && (
              <div className="p-12 text-center text-sm text-slate-400">
                No customers found.
              </div>
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-10 place-items-center rounded-xl ${
                editingId !== null
                  ? "bg-blue-600 text-white"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {editingId !== null ? (
                <Pencil size={18} />
              ) : (
                <Users size={19} />
              )}
            </div>

            <div>
              <h2 className="font-black">
                {editingId !== null
                  ? "Edit customer"
                  : "Add customer"}
              </h2>

              <p className="text-xs text-slate-500">
                {editingId !== null
                  ? "Update customer details."
                  : "Create a new billing contact."}
              </p>
            </div>
          </div>

          <form
            onSubmit={saveCustomer}
            className="mt-5 space-y-4"
          >
            <label className="block text-sm font-bold">
              Full name

              <input
                className="input mt-1.5"
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-bold">
              Email

              <input
                className="input mt-1.5"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-bold">
              Phone

              <input
                className="input mt-1.5"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-bold">
              Address

              <textarea
                className="input mt-1.5 min-h-24 resize-y"
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
              />
            </label>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId !== null
                    ? "Update customer"
                    : "Save customer"}
              </Button>

              {editingId !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
