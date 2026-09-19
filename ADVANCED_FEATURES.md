# Advanced Billing Features — Integrated

Implemented directly in the existing Next.js + MongoDB application:

- Product cost price + invoice cost-price snapshots
- Atomic stock deduction when creating invoices
- Stock reconciliation when editing invoices
- Stock restoration when deleting invoices created by the new inventory flow
- Partial payments with Cash / UPI / Bank Transfer
- Payment ledger per invoice
- Customer outstanding ledger API + customer-page outstanding balance
- MongoDB dashboard aggregation for revenue, units, cost and gross profit
- Current-month revenue metric
- UPI intent QR using `upi://pay` and the outstanding amount
- UPI/bank details in `/settings`
- QR on the invoice UI, postcard print page and generated PDF
- WhatsApp bill sharing as a PNG photo via the browser share sheet, with a desktop fallback download + WhatsApp Web link
- WhatsApp Web sharing with customer phone + invoice link

## Existing data

Existing products without `costPrice` behave as cost price 0 until updated.
Existing invoices without `costPrice` snapshots will therefore not have historical
cost data. New invoices store the product cost price at sale time.

Existing invoices are marked as legacy for inventory purposes (the new
`inventoryAdjusted` field is absent/false). Quantity changes on such invoices are
blocked so the application does not invent stock history.

## MongoDB requirement

Invoice creation/edit/delete and payment recording use MongoDB transactions.
The production MongoDB deployment must support transactions (replica set / Atlas
or another transaction-capable topology). If transaction support is unavailable,
the API intentionally refuses the protected operation instead of risking a
partially updated stock/ledger state.

## QR

The QR encodes a standard UPI intent:
`upi://pay?pa=<VPA>&pn=<merchant>&am=<amount>&cu=INR&tn=<invoice>`.
The VPA is configured in `/settings`. Bank account and IFSC are stored separately
for display/bank details; they are not substituted for a UPI VPA.

## WhatsApp

The invoice view generates a receipt-style PNG in the browser and uses the native
share sheet when the browser supports file sharing, so WhatsApp can receive the
actual image. Desktop/unsupported browsers download the PNG and open WhatsApp
for manual attachment. Fully automated sending without user interaction still
requires the Meta WhatsApp Business/Cloud API.

## Validation

A full `npm ci`/`next build` could not be run in the build environment because
external npm registry packages were unavailable. The source changes were made
against the uploaded project structure. Run `npm ci` followed by `npm run build`
locally/CI before production deployment.
