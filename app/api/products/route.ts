import { connectDB } from "@/lib/server/db";
import { createProduct, listProducts } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await connectDB(); return Response.json(await listProducts()); }
  catch (e) { return jsonError(e); }
}
export async function POST(req: Request) {
  try { await connectDB(); return Response.json(await createProduct(await req.json()), { status: 201 }); }
  catch (e) { return jsonError(e); }
}
