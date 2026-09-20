import mongoose, { Schema, Model } from "mongoose";

const productSchema = new Schema({
  id: { type: Number, unique: true, index: true, required: true },
  sku: { type: String, default: "" },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0, default: 0 },
  costPrice: { type: Number, required: true, min: 0, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  taxable: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });

const customerSchema = new Schema({
  id: { type: Number, unique: true, index: true, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
}, { timestamps: true, versionKey: false });

const invoiceItemSchema = new Schema({
  id: { type: Number },
  product: {
    id: { type: Number, required: true },
    sku: { type: String, default: "" },
    name: { type: String, required: true },
  },
  rate: { type: Number, required: true, min: 0, default: 0 },
  costPrice: { type: Number, required: true, min: 0, default: 0 },
  quantity: { type: Number, required: true, min: 0.01, default: 1 },
  amount: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const customerSnapshotSchema = new Schema({
  id: { type: Number },
  name: { type: String, required: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
}, { _id: false });

const invoiceSchema = new Schema({
  id: { type: Number, unique: true, index: true, required: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  customer: { type: customerSnapshotSchema, default: null },
  subtotal: { type: Number, required: true, min: 0, default: 0 },
  tax: { type: Number, required: true, min: 0, default: 0 },
  discount: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0, default: 0 },
  amountPaid: { type: Number, min: 0, default: 0 },
  amountDue: { type: Number, min: 0, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["UNPAID", "PARTIAL", "PAID"],
    default: "UNPAID",
    index: true,
  },
  status: { type: String, default: "PAID" },
  inventoryAdjusted: { type: Boolean, default: false },
  items: { type: [invoiceItemSchema], default: [] },
}, { versionKey: false });

const stockEntryItemSchema = new Schema({
  productId: {
    type: Number,
    required: true,
  },

  productName: {
    type: String,
    required: true,
  },

  sku: {
    type: String,
    default: "",
  },

  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },

  purchaseRate: {
    type: Number,
    required: true,
    min: 0,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });


const stockEntrySchema = new Schema({
  id: {
    type: Number,
    unique: true,
    index: true,
    required: true,
  },

  supplierName: {
    type: String,
    default: "",
    trim: true,
  },

  supplierInvoiceNo: {
    type: String,
    default: "",
    trim: true,
  },

  entryDate: {
    type: Date,
    default: Date.now,
  },

  /*
   * Small compressed bill image.
   * The frontend should resize/compress before sending.
   */
  sourceImageData: {
    type: String,
    default: "",
  },

  totalAmount: {
    type: Number,
    min: 0,
    default: 0,
  },

  items: {
    type: [stockEntryItemSchema],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

const paymentLedgerSchema = new Schema({
  id: { type: Number, unique: true, index: true, required: true },
  invoiceId: { type: Number, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: Number, default: null, index: true },
  customerName: { type: String, default: "" },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMode: {
    type: String,
    enum: ["CASH", "UPI", "BANK_TRANSFER"],
    required: true,
  },
  paymentDate: { type: Date, default: Date.now },
  referenceNumber: { type: String, default: "" },
  notes: { type: String, default: "" },
}, { timestamps: true, versionKey: false });

const businessSettingsSchema = new Schema({
  key: { type: String, unique: true, default: "default" },
  businessName: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  upiId: { type: String, default: "" },
  accountHolderName: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },
  ifsc: { type: String, default: "" },
}, { timestamps: true, versionKey: false });

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { versionKey: false });

export const Product = (mongoose.models.Product as Model<any>) || mongoose.model("Product", productSchema);
export const Customer = (mongoose.models.Customer as Model<any>) || mongoose.model("Customer", customerSchema);
export const Invoice = (mongoose.models.Invoice as Model<any>) || mongoose.model("Invoice", invoiceSchema);
export const PaymentLedger = (mongoose.models.PaymentLedger as Model<any>) || mongoose.model("PaymentLedger", paymentLedgerSchema);
export const BusinessSettings = (mongoose.models.BusinessSettings as Model<any>) || mongoose.model("BusinessSettings", businessSettingsSchema);
export const Counter =
  (mongoose.models.Counter as Model<any>) ||
  mongoose.model("Counter", counterSchema);

export const StockEntry =
  (mongoose.models.StockEntry as Model<any>) ||
  mongoose.model("StockEntry", stockEntrySchema);

