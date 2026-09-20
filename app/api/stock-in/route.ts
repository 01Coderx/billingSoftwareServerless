import { connectDB } from "@/lib/server/db";
import {
  createStockEntry,
  listStockEntries,
} from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    return Response.json(
      await listStockEntries(),
    );
  } catch (e) {
    return jsonError(e);
  }
}


export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    return Response.json(
      await createStockEntry(body),
      { status: 201 },
    );
  } catch (e) {
    return jsonError(e);
  }
}
