import mongoose, { ClientSession } from "mongoose";
import { getCacheSafe, setCacheSafe, invalidateCacheSafe } from "@/lib/redis";import {
  Customer,
  Product,
  Invoice,
  PaymentLedger,
  BusinessSettings,
  Counter,
  StockEntry,
} from "./models";

const money = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100;

async function nextSequence(name: "customer" | "product" | "invoice" | "payment" | "stockEntry", session?: ClientSession) {
const Model =
  name === "customer"
    ? Customer
    : name === "product"
      ? Product
      : name === "invoice"
        ? Invoice
        : name === "payment"
          ? PaymentLedger
          : StockEntry;
  const highestQuery = Model.findOne({}).sort({ id: -1 }).select({ id: 1 });
  if (session) highestQuery.session(session);
  const highest = await highestQuery.lean<any>();
  const currentMax = Number(highest?.id || 0);

  const counter = await Counter.findOneAndUpdate(
    { _id: name, seq: { $lt: currentMax } },
    { $set: { seq: currentMax } },
    { new: true, session }
  ).lean<any>();

  if (!counter) {
    const result = await Counter.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    ).lean<any>();
    if (!result) throw new Error("Could not generate sequence");
    return Number(result.seq);
  }

  const result = await Counter.findOneAndUpdate(
    { _id: name }, { $inc: { seq: 1 } }, { new: true, session }
  ).lean<any>();
  if (!result) throw new Error("Could not generate sequence");
  return Number(result.seq);
}

export async function listProducts() {
  const key = "cache:products:all";
  const cached = await getCacheSafe<any[]>(key);
  if (cached !== null) return cached;
  const products = await Product.find().sort({ id: -1 }).lean();
  await setCacheSafe(key, products, 300);
  return products;
}
export async function getProduct(id: string | number) {
  const key = `cache:products:${Number(id)}`;
  const cached = await getCacheSafe<any>(key);
  if (cached !== null) return cached;
  const product = await Product.findOne({ id: Number(id) }).lean();
  if (product) await setCacheSafe(key, product, 300);
  return product;
}

export async function createProduct(data: any) {
  const product = await Product.create({
    id: await nextSequence("product"), sku: data.sku || "", name: data.name,
    description: data.description || "", price: Number(data.price || 0),
    costPrice: Number(data.costPrice || 0), stock: Number(data.stock || 0),
    taxable: data.taxable !== false,
  });
  await invalidateCacheSafe("cache:products:all");
  return product.toObject();
}

export async function updateProduct(id: string | number, data: any) {
  return Product.findOneAndUpdate({ id: Number(id) }, { $set: {
    ...(data.sku !== undefined && { sku: data.sku }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.price !== undefined && { price: Number(data.price) }),
    ...(data.costPrice !== undefined && { costPrice: Number(data.costPrice) }),
    ...(data.stock !== undefined && { stock: Number(data.stock) }),
    ...(data.taxable !== undefined && { taxable: Boolean(data.taxable) }),
  }}, { new: true, runValidators: true }).lean().then(async (product) => {
    if (product) { await invalidateCacheSafe("cache:products:all"); await invalidateCacheSafe(`cache:products:${Number(id)}`); }
    return product;
  });
}
export async function removeProduct(id: string | number) {
  const result = await Product.deleteOne({ id: Number(id) });
  if (result.deletedCount) { await invalidateCacheSafe("cache:products:all"); await invalidateCacheSafe(`cache:products:${Number(id)}`); }
  return result;
}

export async function listStockEntries() {
  return StockEntry.find()
    .sort({ id: -1 })
    .lean();
}


export async function getStockEntry(id: string | number) {
  return StockEntry.findOne({
    id: Number(id),
  }).lean();
}


export async function createStockEntry(input: any) {
  if (!input || !Array.isArray(input.items) || !input.items.length) {
    throw new Error("Stock entry items are required");
  }

  const session = await mongoose.startSession();

  try {
    let created: any = null;

    await session.withTransaction(async () => {
      const items: any[] = [];
      let totalAmount = 0;

      for (const raw of input.items) {
        const productId = Number(raw.productId);

        if (!Number.isFinite(productId)) {
          throw new Error("Every stock item must have a valid product");
        }

        const quantity = Number(raw.quantity);
        const purchaseRate = Number(raw.purchaseRate);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error("Stock quantity must be greater than zero");
        }

        if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
          throw new Error("Purchase rate must be zero or greater");
        }

        const product = await Product.findOne({
          id: productId,
        })
          .session(session)
          .lean<any>();

        if (!product) {
          throw new Error(`Product not found: ${productId}`);
        }

        const amount = money(quantity * purchaseRate);

        items.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku || "",
          quantity,
          purchaseRate: money(purchaseRate),
          amount,
        });

        totalAmount = money(totalAmount + amount);

        /*
         * IMPORTANT:
         *
         * stock increases here
         * costPrice becomes latest purchase cost
         *
         * selling price is NOT changed.
         */
        const updated = await Product.findOneAndUpdate(
          { id: productId },
          {
            $inc: {
              stock: quantity,
            },
            $set: {
              costPrice: money(purchaseRate),
            },
          },
          {
            new: true,
            session,
          },
        ).lean();

        if (!updated) {
          throw new Error(
            `Could not update stock for ${product.name}`,
          );
        }
      }

      const stockEntryId = await nextSequence(
        "stockEntry",
        session,
      );

      const docs = await StockEntry.create(
        [
          {
            id: stockEntryId,
            supplierName: input.supplierName || "",
            supplierInvoiceNo:
              input.supplierInvoiceNo || "",
            entryDate: input.entryDate
              ? new Date(input.entryDate)
              : new Date(),
            sourceImageData:
              input.sourceImageData || "",
            totalAmount,
            items,
          },
        ],
        { session },
      );

      created = docs[0].toObject();
    });

    await invalidateCacheSafe("cache:products:all");

    for (const item of created?.items || []) {
      await invalidateCacheSafe(
        `cache:products:${Number(item.productId)}`,
      );
    }

    return created;
  } finally {
    await session.endSession();
  }
}

export async function listCustomers() { return Customer.find().sort({ id: -1 }).lean(); }
export async function getCustomer(id: string | number) { return Customer.findOne({ id: Number(id) }).lean(); }
export async function createCustomer(data: any) {
  const customer = await Customer.create({ id: await nextSequence("customer"), name: data.name, email: data.email || "", phone: data.phone || "", address: data.address || "" });
  return customer.toObject();
}
export async function updateCustomer(id: string | number, data: any) {
  return Customer.findOneAndUpdate({ id: Number(id) }, { $set: {
    ...(data.name !== undefined && { name: data.name }), ...(data.email !== undefined && { email: data.email }),
    ...(data.phone !== undefined && { phone: data.phone }), ...(data.address !== undefined && { address: data.address }),
  }}, { new: true, runValidators: true }).lean();
}
export async function removeCustomer(id: string | number) { return Customer.deleteOne({ id: Number(id) }); }

async function buildInvoice(input: any, existing: any = null, session?: ClientSession) {
  if (!input || !Array.isArray(input.items) || !input.items.length) throw new Error("Invoice items are required");

  let customer = null;
  if (input.customer?.id != null) {
    const customerQuery = Customer.findOne({ id: Number(input.customer.id) });
    if (session) customerQuery.session(session);
    const found = await customerQuery.lean<any>();
    if (!found) throw new Error(`Customer not found: ${input.customer.id}`);
    customer = { id: found.id, name: found.name, email: found.email || "", phone: found.phone || "", address: found.address || "" };
  }

  const items: any[] = [];
  let subtotal = 0;
  for (let index = 0; index < input.items.length; index++) {
    const raw = input.items[index];
    const productId = raw.product?.id ?? raw.productId;
    if (productId == null) throw new Error("Every invoice item must have a product id");
    const productQuery = Product.findOne({ id: Number(productId) });
    if (session) productQuery.session(session);
    const product = await productQuery.lean<any>();
    const existingItem = existing?.items?.find((item: any) => Number(item.product?.id) === Number(productId));
    if (!product && !existingItem) throw new Error(`Product not found: ${productId}`);

    const productData = product ? { id: product.id, sku: product.sku || "", name: product.name } : existingItem.product;
    const quantity = Number(raw.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be a positive number");
    const rate = raw.rate === undefined || raw.rate === null || raw.rate === "" ? Number(product?.price ?? existingItem?.rate ?? 0) : Number(raw.rate);
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Rate must be a non-negative number");
    const costPrice = money(product?.costPrice ?? existingItem?.costPrice ?? 0);
    const amount = money(rate * quantity);
    subtotal = money(subtotal + amount);
    items.push({ id: raw.id || index + 1, product: productData, rate: money(rate), costPrice, quantity, amount });
  }

  const tax = money(input.tax), discount = money(input.discount);
  if (tax < 0 || discount < 0) throw new Error("Tax and discount cannot be negative");
  const total = money(Math.max(0, subtotal + tax - discount));
  const id = existing?.id || await nextSequence("invoice", session);
  const oldPaid = money(existing?.amountPaid || 0);
  const amountDue = Math.max(0, money(total - oldPaid));
  const paymentStatus = amountDue <= 0 ? "PAID" : oldPaid > 0 ? "PARTIAL" : "UNPAID";

  return {
    id, invoiceNumber: existing?.invoiceNumber || `INV-${String(id).padStart(6, "0")}`,
    createdAt: existing?.createdAt || new Date(), dueDate: input.dueDate ? new Date(input.dueDate) : null,
    customer, subtotal, tax, discount, total, amountPaid: oldPaid, amountDue,
    paymentStatus, status: input.status || existing?.status || "SENT", items,
  };
}

function stockMap(items: any[]) {
  const map = new Map<number, number>();
  for (const item of items || []) {
    const id = Number(item.product?.id);
    map.set(id, (map.get(id) || 0) + Number(item.quantity || 0));
  }
  return map;
}

export async function listInvoices() { return Invoice.find().sort({ id: -1 }).lean(); }
export async function getInvoice(id: string | number) { return Invoice.findOne({ id: Number(id) }).lean(); }

export async function createInvoice(input: any) {
  const session = await mongoose.startSession();
  try {
    let created: any;
    await session.withTransaction(async () => {
      const built: any = await buildInvoice(input, null, session);
      for (const item of built.items) {
        const updated = await Product.findOneAndUpdate(
          { id: item.product.id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        ).lean();
        if (!updated) throw new Error(`Insufficient stock for ${item.product.name}. Available stock may be lower than requested quantity.`);
      }
      built.inventoryAdjusted = true;
      const docs = await Invoice.create([built], { session });
      created = docs[0].toObject();
    });
    await invalidateCacheSafe("cache:products:all");
    for (const item of created?.items || []) await invalidateCacheSafe(`cache:products:${Number(item.product?.id)}`);
    return created;
  } catch (error: any) {
    if (/Transaction numbers are only allowed|replica set|transaction/i.test(String(error?.message || ""))) {
      throw new Error("Invoice stock protection requires a MongoDB deployment with transaction support (replica set/Atlas). No invoice was created.");
    }
    throw error;
  } finally { await session.endSession(); }
}

export async function updateInvoice(id: string | number, input: any) {
  const session = await mongoose.startSession();
  try {
    let updatedInvoice: any = null;
    await session.withTransaction(async () => {
      const existing = await Invoice.findOne({ id: Number(id) }).session(session).lean<any>();
      if (!existing) return;
      const built = await buildInvoice(input, existing, session);
      const oldMap = stockMap(existing.items);
      const newMap = stockMap(built.items);

      if (existing.inventoryAdjusted !== true) {
        const changed = JSON.stringify([...oldMap.entries()].sort()) !== JSON.stringify([...newMap.entries()].sort());
        if (changed) throw new Error("This older invoice has no inventory history. Quantity changes are blocked to protect stock accuracy.");
      } else {
        const productIds = new Set([...oldMap.keys(), ...newMap.keys()]);
        for (const productId of productIds) {
          const delta = (newMap.get(productId) || 0) - (oldMap.get(productId) || 0);
          if (delta > 0) {
            const product = await Product.findOneAndUpdate({ id: productId, stock: { $gte: delta } }, { $inc: { stock: -delta } }, { new: true, session }).lean<any>();
            if (!product) throw new Error(`Insufficient stock to increase quantity for product ${productId}.`);
          } else if (delta < 0) {
            await Product.findOneAndUpdate({ id: productId }, { $inc: { stock: Math.abs(delta) } }, { new: true, session });
          }
        }
      }

      updatedInvoice = await Invoice.findOneAndUpdate({ id: Number(id) }, { $set: { ...built, inventoryAdjusted: existing.inventoryAdjusted === true } }, { new: true, runValidators: true, session }).lean();
    });
    await invalidateCacheSafe("cache:products:all");
    for (const item of updatedInvoice?.items || []) await invalidateCacheSafe(`cache:products:${Number(item.product?.id)}`);
    return updatedInvoice;
  } finally { await session.endSession(); }
}

export async function removeInvoice(id: string | number) {
  const session = await mongoose.startSession();
  try {
    let result: any;
    const affectedProductIds = new Set<number>();
    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({ id: Number(id) }).session(session).lean<any>();
      if (!invoice) { result = { deletedCount: 0 }; return; }
      if (invoice.inventoryAdjusted === true) {
        for (const item of invoice.items || []) {
          affectedProductIds.add(Number(item.product.id));
          await Product.findOneAndUpdate({ id: item.product.id }, { $inc: { stock: item.quantity } }, { session });
        }
      }
      await PaymentLedger.deleteMany({ invoiceId: Number(id) }, { session });
      result = await Invoice.deleteOne({ id: Number(id) }, { session });
    });
    await invalidateCacheSafe("cache:products:all");
    for (const productId of affectedProductIds) await invalidateCacheSafe(`cache:products:${productId}`);
    return result;
  } finally { await session.endSession(); }
}

export async function recordPayment(input: any) {
  const session = await mongoose.startSession();
  try {
    let result: any;
    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({ id: Number(input.invoiceId) }).session(session).lean<any>();
      if (!invoice) throw new Error("Invoice not found");
      const amount = money(input.amount);
      if (amount <= 0) throw new Error("Payment amount must be greater than zero");
      if (!["CASH", "UPI", "BANK_TRANSFER"].includes(input.paymentMode)) throw new Error("Invalid payment mode");
      const paid = money(invoice.amountPaid || 0);
      const due = Math.max(0, money(invoice.total - paid));
      if (amount > due) throw new Error(`Payment exceeds outstanding amount of ₹${due.toFixed(2)}`);
      const paymentId = await nextSequence("payment", session);
      const newPaid = money(paid + amount);
      const newDue = Math.max(0, money(invoice.total - newPaid));
      const paymentStatus = newDue <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";
      await PaymentLedger.create([{
        id: paymentId, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customer?.id || null, customerName: invoice.customer?.name || "",
        amount, paymentMode: input.paymentMode, paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        referenceNumber: input.referenceNumber || "", notes: input.notes || "",
      }], { session });
      result = await Invoice.findOneAndUpdate({ id: invoice.id }, { $set: { amountPaid: newPaid, amountDue: newDue, paymentStatus } }, { new: true, session }).lean();
    });
    return result;
  } finally { await session.endSession(); }
}

export async function listInvoicePayments(id: string | number) {
  return PaymentLedger.find({ invoiceId: Number(id) }).sort({ paymentDate: -1, id: -1 }).lean();
}

export async function getCustomerLedger(id: string | number) {
  const customerId = Number(id);
  const [summary, invoices] = await Promise.all([
    Invoice.aggregate([
      { $match: { "customer.id": customerId, status: { $ne: "CANCELLED" } } },
      { $group: { _id: "$customer.id", invoices: { $sum: 1 }, sales: { $sum: "$total" }, paid: { $sum: "$amountPaid" }, outstanding: { $sum: "$amountDue" } } },
    ]),
    Invoice.find({ "customer.id": customerId }).sort({ id: -1 }).select({ id: 1, invoiceNumber: 1, createdAt: 1, total: 1, amountPaid: 1, amountDue: 1, paymentStatus: 1 }).lean(),
  ]);
  return { summary: summary[0] || { invoices: 0, sales: 0, paid: 0, outstanding: 0 }, invoices };
}

export async function getDashboardAnalytics() {
  const monthly = await Invoice.aggregate([
    { $match: { status: { $ne: "CANCELLED" } } },
    { $unwind: "$items" },
    { $group: {
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
      revenue: { $sum: "$items.amount" },
      cost: { $sum: { $multiply: ["$items.costPrice", "$items.quantity"] } },
      units: { $sum: "$items.quantity" },
    }},
    { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  const totals = monthly.reduce((a: any, m: any) => {
    a.revenue += Number(m.revenue || 0); a.cost += Number(m.cost || 0); a.units += Number(m.units || 0); a.profit += Number(m.profit || 0); return a;
  }, { revenue: 0, cost: 0, units: 0, profit: 0 });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [outstanding, currentMonth] = await Promise.all([
    Invoice.aggregate([{ $match: { status: { $ne: "CANCELLED" }, amountDue: { $gt: 0 } } }, { $group: { _id: null, value: { $sum: "$amountDue" } } }]),
    Invoice.aggregate([
      { $match: { status: { $ne: "CANCELLED" }, createdAt: { $gte: monthStart, $lt: nextMonth } } },
      { $unwind: "$items" },
      { $group: { _id: null, revenue: { $sum: "$items.amount" }, cost: { $sum: { $multiply: ["$items.costPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } },
    ]),
  ]);
  const cm = currentMonth[0] || {};
  return { totals: { ...totals, outstanding: Number(outstanding[0]?.value || 0) }, currentMonth: { revenue: Number(cm.revenue || 0), cost: Number(cm.cost || 0), profit: Number(cm.revenue || 0) - Number(cm.cost || 0), units: Number(cm.units || 0) }, monthly: monthly.map((m: any) => ({ year: m._id.year, month: m._id.month, label: `${String(m._id.month).padStart(2, "0")}/${m._id.year}`, revenue: Number(m.revenue || 0), cost: Number(m.cost || 0), units: Number(m.units || 0), profit: Number(m.profit || 0) })) };
}

export async function getReportsAnalytics() {
  const LOW_STOCK_THRESHOLD = 5;
  const TARGET_STOCK = 10;
  const baseMatch = { status: { $ne: "CANCELLED" } };

  const [
    productSummary,
    topProducts,
    monthlySales,
    customerSummary,
    topCustomers,
    lowStockProducts,
  ] = await Promise.all([
    Product.aggregate([
      { $group: {
        _id: null,
        products: { $sum: 1 },
        unitsInStock: { $sum: "$stock" },
        inventoryValue: { $sum: { $multiply: ["$stock", "$costPrice"] } },
        lowStock: { $sum: { $cond: [{ $lte: ["$stock", LOW_STOCK_THRESHOLD] }, 1, 0] } },
      } },
    ]),
    Invoice.aggregate([
      { $match: baseMatch },
      { $unwind: "$items" },
      { $group: {
        _id: "$items.product.id",
        name: { $first: "$items.product.name" },
        sku: { $first: "$items.product.sku" },
        units: { $sum: "$items.quantity" },
        sales: { $sum: "$items.amount" },
        cost: { $sum: { $multiply: ["$items.costPrice", "$items.quantity"] } },
      } },
      { $addFields: { profit: { $subtract: ["$sales", "$cost"] } } },
      { $sort: { sales: -1 } },
      { $limit: 8 },
    ]),
    Invoice.aggregate([
      { $match: baseMatch },
      { $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        sales: { $sum: "$total" },
        invoices: { $sum: 1 },
      } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]),
    Invoice.aggregate([
      { $match: { ...baseMatch, "customer.id": { $ne: null } } },
      { $group: {
        _id: "$customer.id",
        name: { $first: "$customer.name" },
        email: { $first: "$customer.email" },
        phone: { $first: "$customer.phone" },
        invoices: { $sum: 1 },
        sales: { $sum: "$total" },
        paid: { $sum: "$amountPaid" },
        outstanding: { $sum: "$amountDue" },
        lastPurchase: { $max: "$createdAt" },
      } },
      { $addFields: { recurring: { $gte: ["$invoices", 2] } } },
      { $sort: { sales: -1 } },
    ]),
    Invoice.aggregate([
      { $match: { ...baseMatch, "customer.id": { $ne: null } } },
      { $group: {
        _id: "$customer.id",
        name: { $first: "$customer.name" },
        invoices: { $sum: 1 },
        sales: { $sum: "$total" },
        outstanding: { $sum: "$amountDue" },
      } },
      { $sort: { sales: -1 } },
      { $limit: 8 },
    ]),
    Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ stock: 1, name: 1 })
      .limit(10)
      .select({ id: 1, name: 1, sku: 1, stock: 1, price: 1, costPrice: 1 })
      .lean(),
  ]);

  const ps = productSummary[0] || {};
  const customers = customerSummary.map((customer: any) => ({
    id: Number(customer._id),
    name: customer.name || "Unnamed customer",
    email: customer.email || "",
    phone: customer.phone || "",
    invoices: Number(customer.invoices || 0),
    sales: money(customer.sales),
    paid: money(customer.paid),
    outstanding: money(customer.outstanding),
    recurring: Boolean(customer.recurring),
    lastPurchase: customer.lastPurchase,
  }));

  return {
    productAnalysis: {
      products: Number(ps.products || 0),
      unitsInStock: Number(ps.unitsInStock || 0),
      inventoryValue: money(ps.inventoryValue),
      lowStock: Number(ps.lowStock || 0),
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      targetStock: TARGET_STOCK,
    },
    topProducts: topProducts.map((item: any) => ({
      id: Number(item._id),
      name: item.name || "Unknown product",
      sku: item.sku || "",
      units: Number(item.units || 0),
      sales: money(item.sales),
      cost: money(item.cost),
      profit: money(item.profit),
    })),
    monthlySales: monthlySales.map((item: any) => ({
      label: `${String(item._id.month).padStart(2, "0")}/${item._id.year}`,
      sales: money(item.sales),
      invoices: Number(item.invoices || 0),
    })),
    customerAnalysis: {
      customers: customers.length,
      recurringCustomers: customers.filter((customer: any) => customer.recurring).length,
      oneTimeCustomers: customers.filter((customer: any) => !customer.recurring).length,
      sales: money(customers.reduce((sum: number, customer: any) => sum + customer.sales, 0)),
      outstanding: money(customers.reduce((sum: number, customer: any) => sum + customer.outstanding, 0)),
    },
    topCustomers: topCustomers.map((customer: any) => ({
      id: Number(customer._id),
      name: customer.name || "Unnamed customer",
      invoices: Number(customer.invoices || 0),
      sales: money(customer.sales),
      outstanding: money(customer.outstanding),
    })),
    recurringCustomers: customers.filter((customer: any) => customer.recurring).sort((a: any, b: any) => b.sales - a.sales).slice(0, 8),
    lowStockProducts: lowStockProducts.map((product: any) => ({
      id: Number(product.id),
      name: product.name,
      sku: product.sku || "",
      stock: Number(product.stock || 0),
      required: Math.max(0, TARGET_STOCK - Number(product.stock || 0)),
      price: money(product.price),
      costPrice: money(product.costPrice),
    })),
  };
}

export async function getSettings() { return BusinessSettings.findOne({ key: "default" }).lean(); }
export async function updateSettings(data: any) {
  return BusinessSettings.findOneAndUpdate({ key: "default" }, { $set: {
    businessName: data.businessName || "", phone: data.phone || "", address: data.address || "",
    upiId: data.upiId || "", accountHolderName: data.accountHolderName || "", bankAccountNumber: data.bankAccountNumber || "", ifsc: data.ifsc || "",
  }}, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }).lean();
}
