import mongoose, { Schema, Model } from "mongoose";

const productSchema = new Schema({
  id: { type: Number, unique: true, index: true, required: true },
  sku: { type: String, default: "" },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0, default: 0 },
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
  status: { type: String, default: "PAID" },
  items: { type: [invoiceItemSchema], default: [] },
}, { versionKey: false });

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { versionKey: false });

export const Product = (mongoose.models.Product as Model<any>) || mongoose.model("Product", productSchema);
export const Customer = (mongoose.models.Customer as Model<any>) || mongoose.model("Customer", customerSchema);
export const Invoice = (mongoose.models.Invoice as Model<any>) || mongoose.model("Invoice", invoiceSchema);
export const Counter = (mongoose.models.Counter as Model<any>) || mongoose.model("Counter", counterSchema);
