import { connectDB } from "@/lib/server/db";
import { getReportsAnalytics } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";
    return Response.json(await getReportsAnalytics(month));
  } catch (e) {
    return jsonError(e);
  }
}
