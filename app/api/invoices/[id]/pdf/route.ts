import { connectDB } from "@/lib/server/db";
import { getInvoice } from "@/lib/server/billing";
import { generateInvoicePdf } from "@/lib/server/pdf";
import { jsonError } from "@/lib/server/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const invoice = await getInvoice(id);
    if (!invoice) return Response.json({ message: `Invoice not found: ${id}` }, { status: 404 });
    const pdf = await generateInvoicePdf(invoice);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { return jsonError(e); }
}
