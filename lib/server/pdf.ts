import PDFDocument from "pdfkit";

const money = (value: unknown) => Number(value || 0).toFixed(2);
const formatDate = (value: unknown) => value ? new Date(value as string).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-";

async function getQrBuffer(invoice: any, settings: any) {
  const upiId = String(settings?.upiId || "").trim();
  const due = Number(invoice?.amountDue || 0);
  if (!upiId || due <= 0) return null;
  const params = new URLSearchParams({ pa: upiId, pn: settings?.businessName || "Merchant", am: due.toFixed(2), cu: "INR", tn: `Payment for ${invoice.invoiceNumber}` });
  const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(`upi://pay?${params.toString()}`)}`);
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function generateInvoicePdf(invoice: any, settings: any = null): Promise<Buffer> {
  const qr = await getQrBuffer(invoice, settings).catch(() => null);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const width = (100 * 72) / 25.4;
    const height = (148 * 72) / 25.4;
    const doc = new PDFDocument({ size: [width, height], margins: { top: 9, bottom: 9, left: 10, right: 10 }, autoFirstPage: true });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(8).text(settings?.businessName || "BILL / RECEIPT", 10, doc.y, { width: width - 20, align: "center" });
    doc.font("Helvetica-Bold").fontSize(7).text(`Invoice: ${invoice.invoiceNumber || "-"}`, 10, doc.y + 3, { width: width - 20, align: "left" });
    doc.font("Helvetica").fontSize(5.8).text(`Date: ${formatDate(invoice.createdAt)}`, 10, doc.y - 7, { width: width - 20, align: "right" });
    const customer = invoice.customer?.name || "Walk-in Customer"; const phone = invoice.customer?.phone || "";
    doc.moveDown(0.35); doc.font("Helvetica-Bold").fontSize(8).text("Customer: ", { continued: true }); doc.font("Helvetica-Bold").fontSize(9).text(customer, { continued: Boolean(phone) }); if (phone) doc.font("Helvetica").fontSize(7).text(`  |  ${phone}`);
    doc.moveDown(0.3);
    const left = 10, tableWidth = width - 20, cols = [13, 65, 35, 25, tableWidth - 138], headers = ["#", "ITEM", "RATE", "QTY", "AMOUNT"]; let y = doc.y; const rowH = 15;
    doc.font("Helvetica-Bold").fontSize(7.5); let x = left; headers.forEach((h,i)=>{doc.rect(x,y,cols[i],rowH).stroke();doc.text(h,x+2,y+4,{width:cols[i]-4,align:i===1?"left":"right"});x+=cols[i]});
    y += rowH; doc.font("Helvetica").fontSize(7); (invoice.items||[]).forEach((item:any,index:number)=>{const vals=[String(index+1),item.product?.name||"Item",money(item.rate),String(item.quantity||0),money(item.amount)];let xx=left;vals.forEach((v,i)=>{doc.rect(xx,y,cols[i],rowH).stroke();doc.text(v,xx+2,y+4,{width:cols[i]-4,align:i===1?"left":"right",ellipsis:true});xx+=cols[i]});y+=rowH});
    y+=5; doc.font("Helvetica").fontSize(7).text(`Subtotal  ${money(invoice.subtotal)}`,left,y,{width:tableWidth,align:"right"});y+=10;
    if(Number(invoice.tax)){doc.text(`Tax  ${money(invoice.tax)}`,left,y,{width:tableWidth,align:"right"});y+=10} if(Number(invoice.discount)){doc.text(`Discount  -${money(invoice.discount)}`,left,y,{width:tableWidth,align:"right"});y+=10}
    doc.font("Helvetica-Bold").fontSize(8.5).text(`TOTAL  ${money(invoice.total)}`,left,y,{width:tableWidth,align:"right"}); y+=11;
    doc.font("Helvetica").fontSize(7).text(`PAID  ${money(invoice.amountPaid)}     DUE  ${money(invoice.amountDue)}`,left,y,{width:tableWidth,align:"right"});
    if(qr){ const qrSize=58; const qrX=width/2-qrSize/2; const qrY=height-78; doc.image(qr,qrX,qrY,{width:qrSize,height:qrSize}); doc.font("Helvetica").fontSize(5.5).text(`Scan to pay ${money(invoice.amountDue)}`,10,qrY+qrSize+2,{width:width-20,align:"center"}); }
    doc.font("Helvetica").fontSize(5.8).text("Thank you for your business.",left,height-18,{width:tableWidth,align:"center"}); doc.end();
  });
}
