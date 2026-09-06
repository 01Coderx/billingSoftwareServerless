import { connectDB } from "@/lib/server/db";
import { createInvoice, listInvoices } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await connectDB(); return Response.json(await listInvoices()); } catch (e) { return jsonError(e); }
}
export async function POST(req: Request) {
  try { await connectDB(); return Response.json(await createInvoice(await req.json()), { status: 201 }); } catch (e) { return jsonError(e); }
}
