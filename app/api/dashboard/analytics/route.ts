import { connectDB } from "@/lib/server/db";
import { getDashboardAnalytics } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";
export const dynamic = "force-dynamic";
export async function GET() { try { await connectDB(); return Response.json(await getDashboardAnalytics()); } catch (e) { return jsonError(e); } }
