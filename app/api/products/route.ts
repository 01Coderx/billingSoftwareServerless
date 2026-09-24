import { connectDB } from "@/lib/server/db";
import { createProduct, listProducts } from "@/lib/server/billing";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page") || 1)
    );

    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );

    const search = searchParams.get("search") || "";

    return Response.json(
      await listProducts({
        page,
        limit,
        search,
      })
    );
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    return Response.json(
      await createProduct(await req.json()),
      { status: 201 }
    );
  } catch (e) {
    return jsonError(e);
  }
}
