import { connectDB } from "@/lib/server/db";
import { listInvoicePayments } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; await connectDB(); return Response.json(await listInvoicePayments(id)); } catch (e) { return jsonError(e); } }
