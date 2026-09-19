import { connectDB } from "@/lib/server/db";
import { recordPayment } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";
export const dynamic = "force-dynamic";
export async function POST(req: Request) { try { await connectDB(); return Response.json(await recordPayment(await req.json()), { status: 201 }); } catch (e) { return jsonError(e); } }
