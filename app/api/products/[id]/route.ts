import { connectDB } from "@/lib/server/db";
import { getProduct, updateProduct, removeProduct } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await connectDB(); const item = await getProduct(id); if (!item) return Response.json({ message: `Product not found: ${id}` }, { status: 404 }); return Response.json(item); }
  catch (e) { return jsonError(e); }
}
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await connectDB(); const item = await updateProduct(id, await req.json()); if (!item) return Response.json({ message: `Product not found: ${id}` }, { status: 404 }); return Response.json(item); }
  catch (e) { return jsonError(e); }
}
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) { return PUT(req, ctx); }
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await connectDB(); const result = await removeProduct(id); if (!result.deletedCount) return Response.json({ message: `Product not found: ${id}` }, { status: 404 }); return new Response(null, { status: 204 }); }
  catch (e) { return jsonError(e); }
}
