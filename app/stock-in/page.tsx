"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, FileImage, PackagePlus, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, request } from "@/lib/api";
import type { Product } from "@/types/billing";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";


type StockLine = {
  rowId: string;
  product: Product;
  quantity: number;
  purchaseRate: number;
};

type StockEntryResponse = {
  id: number;
};

type StockInPayload = {
  supplierName: string;
  supplierInvoiceNo: string;
  entryDate: string;
  sourceImageData: string;
  items: Array<{
    productId: number;
    quantity: number;
    purchaseRate: number;
  }>;
};

function getTodayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normaliseHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function findColumn(headers: string[], names: string[]) {
  const wanted = names.map(normaliseHeader);
  return headers.findIndex((header) =>
    wanted.includes(normaliseHeader(header))
  );
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new window.Image();

      image.onload = () => {
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not process the image."));
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = () => reject(new Error("Could not read the selected image."));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export default function StockInPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<StockLine[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [entryDate, setEntryDate] = useState(getTodayLocal);
  const [sourceImageData, setSourceImageData] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    api.products
  .list()
  .then((result) => {
    if (!cancelled) {
      setProducts(result.products);
      setError("");
    }
  })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load products"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalAmount = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + Number(line.quantity || 0) * Number(line.purchaseRate || 0),
        0
      ),
    [lines]
  );

  const totalQuantity = useMemo(
    () => lines.reduce((total, line) => total + Number(line.quantity || 0), 0),
    [lines]
  );

  function addProduct(productId?: string) {
    if (!productId) return;

    const product = products.find((item) => String(item.id) === productId);
    if (!product?.id) return;

    setLines((current) => [
      ...current,
      {
        rowId: createRowId(),
        product,
        quantity: 1,
        purchaseRate: Number(product.costPrice || 0),
      },
    ]);
  }

  function removeLine(rowId: string) {
    setLines((current) => current.filter((line) => line.rowId !== rowId));
  }

  function updateLine(
    rowId: string,
    field: "quantity" | "purchaseRate",
    value: string
  ) {
    const numericValue = value === "" ? 0 : Number(value);

    setLines((current) =>
      current.map((line) =>
        line.rowId === rowId
          ? {
              ...line,
              [field]: Number.isFinite(numericValue) ? numericValue : 0,
            }
          : line
      )
    );
  }

  function changeProduct(rowId: string, productId: string) {
    const product = products.find((item) => String(item.id) === productId);
    if (!product?.id) return;

    setLines((current) =>
      current.map((line) =>
        line.rowId === rowId
          ? {
              ...line,
              product,
              purchaseRate: Number(product.costPrice || 0),
            }
          : line
      )
    );
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid purchase bill image.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError("Image is too large. Please choose an image under 12 MB.");
      return;
    }

    setProcessingFile(true);
    setError("");

    try {
      const compressed = await compressImage(file);
      setSourceImageData(compressed);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not process the image"
      );
    } finally {
      setProcessingFile(false);
    }
  }

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setProcessingFile(true);
    setError("");
    setSuccess("");

    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length < 2) {
        throw new Error("CSV must contain a header row and at least one product row.");
      }

      const headers = parseCsvLine(rows[0]);
      const skuIndex = findColumn(headers, ["sku", "code", "productcode", "itemcode"]);
      const nameIndex = findColumn(headers, ["product", "productname", "name", "item", "itemname"]);
      const quantityIndex = findColumn(headers, ["quantity", "qty", "stock"]);
      const purchaseRateIndex = findColumn(headers, [
        "purchaserate",
        "costprice",
        "cost",
        "rate",
      ]);

      if (quantityIndex === -1 || purchaseRateIndex === -1) {
        throw new Error(
          "CSV must contain Quantity and PurchaseRate columns. SKU or Product name is also required."
        );
      }

      if (skuIndex === -1 && nameIndex === -1) {
        throw new Error("CSV must contain either SKU or Product name.");
      }

      const imported: StockLine[] = [];
      const skipped: string[] = [];

      rows.slice(1).forEach((row, index) => {
        const columns = parseCsvLine(row);
        const sku = skuIndex >= 0 ? columns[skuIndex] || "" : "";
        const name = nameIndex >= 0 ? columns[nameIndex] || "" : "";
        const quantity = Number(columns[quantityIndex] || 0);
        const purchaseRate = Number(columns[purchaseRateIndex] || 0);

        const product = products.find((item) => {
          const skuMatch =
            sku && (item.sku || "").toLowerCase() === sku.toLowerCase();
          const nameMatch =
            name && (item.name || "").toLowerCase() === name.toLowerCase();
          return Boolean(skuMatch || nameMatch);
        });

        if (!product?.id) {
          skipped.push(`${index + 2}: ${sku || name || "unknown product"}`);
          return;
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
          skipped.push(`${index + 2}: invalid quantity`);
          return;
        }

        if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
          skipped.push(`${index + 2}: invalid purchase rate`);
          return;
        }

        imported.push({
          rowId: createRowId(),
          product,
          quantity,
          purchaseRate,
        });
      });

      if (!imported.length) {
        throw new Error(
          skipped.length
            ? `No valid products were imported. ${skipped.slice(0, 3).join("; ")}`
            : "No valid products were imported."
        );
      }

      setLines(imported);

      if (skipped.length) {
        setSuccess(
          `${imported.length} row(s) imported. ${skipped.length} row(s) skipped because the product could not be matched or the values were invalid.`
        );
      } else {
        setSuccess(`${imported.length} row(s) imported successfully. Review them before saving.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import CSV");
    } finally {
      setProcessingFile(false);
    }
  }

  async function saveStock() {
    setError("");
    setSuccess("");

    if (!lines.length) {
      setError("Add at least one product before saving stock.");
      return;
    }

    if (!entryDate) {
      setError("Please select a stock entry date.");
      return;
    }

    for (const line of lines) {
      if (!line.product.id) {
        setError("One of the selected products is invalid.");
        return;
      }

      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        setError(`Invalid quantity for ${line.product.name}.`);
        return;
      }

      if (!Number.isFinite(line.purchaseRate) || line.purchaseRate < 0) {
        setError(`Invalid purchase rate for ${line.product.name}.`);
        return;
      }
    }

    const payload: StockInPayload = {
      supplierName: supplierName.trim(),
      supplierInvoiceNo: supplierInvoiceNo.trim(),
      entryDate,
      sourceImageData,
      items: lines.map((line) => ({
        productId: line.product.id as number,
        quantity: Number(line.quantity),
        purchaseRate: Number(line.purchaseRate),
      })),
    };

    setSaving(true);

    try {
      const created = await request<StockEntryResponse>("/api/stock-in", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(
        `Stock entry #${created.id} saved successfully. ${formatCurrency(totalAmount)} added to purchase history.`
      );

      setLines([]);
      setSupplierName("");
      setSupplierInvoiceNo("");
      setEntryDate(getTodayLocal());
      setSourceImageData("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save stock entry");
    } finally {
      setSaving(false);
    }
  }

  if (loadingProducts) {
    return (
      <div className="fade-in">
        <PageHeader
          eyebrow="Inventory"
          title="Stock In"
          description="Add purchased stock, keep purchase costs separate from selling prices, and attach the supplier bill."
        />
        <div className="card p-8 text-sm font-semibold text-slate-500">
          Loading product catalogue…
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Inventory"
        title="Stock In"
        description="Add purchased stock, keep purchase costs separate from selling prices, and attach the supplier bill."
        actionHref="/products"
        actionLabel="Products"
      />

      {(error || success) && (
        <div
          className={`mb-5 rounded-2xl border p-4 text-sm font-semibold ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <div className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-black text-slate-900">
                  <PackagePlus size={19} className="text-blue-600" />
                  Purchase details
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Purchase rate is the rate at which the goods arrived. It does not change the default selling rate.
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                {lines.length} line{lines.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-bold text-slate-700">
                Supplier
                <input
                  className="input mt-1.5"
                  placeholder="ABC Traders"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Purchase Bill No.
                <input
                  className="input mt-1.5"
                  placeholder="INV-1024"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Entry Date
                <input
                  className="input mt-1.5"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-black text-slate-900">Stock items</div>
                <p className="mt-1 text-sm text-slate-500">
                  Add products manually or import multiple rows from CSV.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                />

                <Button
                  type="button"
                  variant="secondary"
                  disabled={processingFile}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={16} />
                  Import CSV
                </Button>

                <select
                  className="input min-w-[210px] sm:w-auto"
                  value=""
                  onChange={(e) => addProduct(e.target.value)}
                  disabled={!products.length}
                >
                  <option value="">
                    {products.length ? "+ Add Product" : "No products available"}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}{product.sku ? ` · ${product.sku}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="grid place-items-center px-6 py-16 text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <PackagePlus size={24} />
                </div>
                <div className="mt-4 text-base font-black text-slate-900">No stock items yet</div>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Add products manually or import a CSV. You can edit the quantity and purchase rate before confirming stock.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(220px,1.5fr)_110px_150px_150px_48px] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:grid">
                  <div>Product</div>
                  <div>Qty</div>
                  <div>Purchase Rate</div>
                  <div>Amount</div>
                  <div />
                </div>

                <div className="divide-y divide-slate-100">
                  {lines.map((line) => (
                    <div
                      key={line.rowId}
                      className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,1.5fr)_110px_150px_150px_48px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:hidden">
                          Product
                        </div>
                        <Select
                          value={String(line.product.id ?? "")}
                          onValueChange={(value) => changeProduct(line.rowId, value)}
                        >
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}{product.sku ? ` · ${product.sku}` : ""}
                            </option>
                          ))}
                        </Select>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Current stock: <strong className="text-slate-700">{line.product.stock}</strong>
                          </span>
                          <span>
                            Default sale: <strong className="text-slate-700">{formatCurrency(line.product.price)}</strong>
                          </span>
                        </div>
                      </div>

                      <label className="block text-sm font-bold text-slate-700">
                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400 lg:hidden">
                          Qty
                        </span>
                        <input
                          className="input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.rowId, "quantity", e.target.value)}
                        />
                      </label>

                      <label className="block text-sm font-bold text-slate-700">
                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-400 lg:hidden">
                          Purchase Rate
                        </span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.purchaseRate}
                          onChange={(e) => updateLine(line.rowId, "purchaseRate", e.target.value)}
                        />
                      </label>

                      <div>
                        <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:hidden">
                          Amount
                        </div>
                        <div className="text-lg font-black text-slate-950">
                          {formatCurrency(line.quantity * line.purchaseRate)}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {line.quantity} × {formatCurrency(line.purchaseRate)}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeLine(line.rowId)}
                          className="btn btn-ghost !p-2 text-rose-500 hover:bg-rose-50"
                          aria-label={`Remove ${line.product.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Quantity
                      </div>
                      <div className="mt-1 text-xl font-black text-slate-900">
                        {totalQuantity}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Total Purchase
                      </div>
                      <div className="mt-1 text-2xl font-black text-blue-600">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <section className="card p-5">
            <div className="flex items-center gap-2 text-base font-black text-slate-900">
              <FileImage size={18} className="text-blue-600" />
              Purchase bill image
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Attach the supplier bill for this stock entry. The image is compressed in the browser before it is saved.
            </p>

            <input
              ref={imageInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {!sourceImageData ? (
              <button
                type="button"
                className="mt-4 grid w-full place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
                onClick={() => imageInputRef.current?.click()}
                disabled={processingFile}
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <UploadCloud size={22} />
                </div>
                <div className="mt-3 text-sm font-black text-slate-800">
                  {processingFile ? "Processing image…" : "Upload purchase bill"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  JPG, PNG or other image format
                </div>
              </button>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={sourceImageData}
                  alt="Purchase bill preview"
                  width={900}
                  height={1200}
                  unoptimized
                  className="max-h-[420px] w-full object-contain"
                />
                <div className="flex items-center justify-between border-t border-slate-200 bg-white p-3">
                  <span className="text-xs font-bold text-emerald-600">Bill image attached</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-500"
                    onClick={() => setSourceImageData("")}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="text-sm font-black uppercase tracking-wider text-slate-400">
              Before confirming
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} />
                </div>
                <span className="text-slate-600">
                  Purchase rate will update the product&apos;s latest cost price.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} />
                </div>
                <span className="text-slate-600">
                  Stock quantity will be added atomically when the entry is saved.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} />
                </div>
                <span className="text-slate-600">
                  The product&apos;s selling price will not be overwritten by the purchase rate.
                </span>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={saving || processingFile || !lines.length}
              onClick={saveStock}
            >
              <PackagePlus size={17} />
              {saving ? "Saving Stock…" : "Confirm Stock In"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={saving}
              onClick={() => router.push("/products")}
            >
              <ArrowLeft size={16} />
              Back to Products
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
