import crypto from "node:crypto";
import { Customer, Product, Invoice, Counter } from "./models";

const money = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100;

async function nextSequence(name: string) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(counter.seq);
}

export async function listProducts() { return Product.find().sort({ id: -1 }).lean(); }
export async function getProduct(id: string | number) { return Product.findOne({ id: Number(id) }).lean(); }

export async function createProduct(data: any) {
  let id = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = crypto.randomInt(100000, 999999);
    if (!(await Product.exists({ id: candidate }))) { id = candidate; break; }
  }
  if (!id) throw new Error("Could not generate a unique product ID");
  const product = await Product.create({
    id, sku: data.sku || "", name: data.name, description: data.description || "",
    price: Number(data.price || 0), stock: Number(data.stock || 0), taxable: data.taxable !== false,
  });
  return product.toObject();
}

export async function updateProduct(id: string | number, data: any) {
  return Product.findOneAndUpdate({ id: Number(id) }, { $set: {
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.price !== undefined && { price: Number(data.price) }),
    ...(data.stock !== undefined && { stock: Number(data.stock) }),
    ...(data.taxable !== undefined && { taxable: Boolean(data.taxable) }),
  }}, { new: true, runValidators: true }).lean();
}

export async function removeProduct(id: string | number) { return Product.deleteOne({ id: Number(id) }); }

export async function listCustomers() { return Customer.find().sort({ id: -1 }).lean(); }
export async function getCustomer(id: string | number) { return Customer.findOne({ id: Number(id) }).lean(); }

export async function createCustomer(data: any) {
  const customer = await Customer.create({
    id: await nextSequence("customer"), name: data.name, email: data.email || "",
    phone: data.phone || "", address: data.address || "",
  });
  return customer.toObject();
}

export async function updateCustomer(id: string | number, data: any) {
  return Customer.findOneAndUpdate({ id: Number(id) }, { $set: {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.address !== undefined && { address: data.address }),
  }}, { new: true, runValidators: true }).lean();
}

export async function removeCustomer(id: string | number) { return Customer.deleteOne({ id: Number(id) }); }

async function buildInvoice(input: any, existing: any = null) {
  if (!input || !Array.isArray(input.items)) throw new Error("Invoice items are required");

  let customer = null;
  if (input.customer?.id != null) {
    const found = await Customer.findOne({ id: Number(input.customer.id) }).lean<any>();
    if (!found) throw new Error(`Customer not found: ${input.customer.id}`);
    customer = { id: found.id, name: found.name, email: found.email || "", phone: found.phone || "", address: found.address || "" };
  }

  const items: any[] = [];
  let subtotal = 0;

  for (let index = 0; index < input.items.length; index++) {
    const raw = input.items[index];
    const productId = raw.product?.id ?? raw.productId;
    if (productId == null) throw new Error("Every invoice item must have a product id");

    const product = await Product.findOne({ id: Number(productId) }).lean<any>();
    const existingItem = existing?.items?.find((item: any) => Number(item.product?.id) === Number(productId));

    if (!product && !existingItem) throw new Error(`Product not found: ${productId}`);

    const productData = product ? {
      id: product.id, sku: product.sku || "", name: product.name,
    } : existingItem.product;

    const quantity = Number(raw.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be a positive number");

    const rate = raw.rate === undefined || raw.rate === null || raw.rate === ""
      ? Number(product?.price ?? existingItem?.rate ?? 0) : Number(raw.rate);
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Rate must be a non-negative number");

    const amount = money(rate * quantity);
    subtotal = money(subtotal + amount);
    items.push({
      id: raw.id || index + 1,
      product: productData,
      rate: money(rate), quantity, amount,
    });
  }

  const tax = money(input.tax);
  const discount = money(input.discount);
  if (tax < 0 || discount < 0) throw new Error("Tax and discount cannot be negative");

  const total = money(Math.max(0, subtotal + tax - discount));
  const id = existing?.id || await nextSequence("invoice");
  return {
    id,
    invoiceNumber: existing?.invoiceNumber || `INV-${String(id).padStart(6, "0")}`,
    createdAt: existing?.createdAt || new Date(),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    customer, subtotal, tax, discount, total,
    status: input.status || existing?.status || "PAID", items,
  };
}

export async function listInvoices() { return Invoice.find().sort({ id: -1 }).lean(); }
export async function getInvoice(id: string | number) { return Invoice.findOne({ id: Number(id) }).lean(); }
export async function createInvoice(input: any) { return Invoice.create(await buildInvoice(input)); }

export async function updateInvoice(id: string | number, input: any) {
  const existing = await Invoice.findOne({ id: Number(id) }).lean();
  if (!existing) return null;
  const built = await buildInvoice(input, existing);
  return Invoice.findOneAndUpdate({ id: Number(id) }, { $set: built }, { new: true, runValidators: true }).lean();
}

export async function removeInvoice(id: string | number) { return Invoice.deleteOne({ id: Number(id) }); }
