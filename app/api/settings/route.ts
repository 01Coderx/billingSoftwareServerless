import { connectDB } from "@/lib/server/db";
import { getSettings, updateSettings } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";
export const dynamic = "force-dynamic";
export async function GET() { try { await connectDB(); return Response.json((await getSettings()) || {}); } catch (e) { return jsonError(e); } }
export async function PUT(req: Request) { try { await connectDB(); return Response.json(await updateSettings(await req.json())); } catch (e) { return jsonError(e); } }
