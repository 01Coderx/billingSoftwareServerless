# Billing Software — Vercel + MongoDB

This version contains the complete billing frontend and the backend functionality converted to Next.js Route Handlers.

## Deployment

1. Push this folder to GitHub or import the project into Vercel.
2. Set the Vercel Root Directory to the folder containing `package.json` if prompted.
3. Add one Environment Variable:
   - `MONGODB_URI` = your MongoDB Atlas connection string.
4. Deploy.

No Render service or separate backend URL is required.

## API routes

- `/api/products`
- `/api/products/:id`
- `/api/customers`
- `/api/customers/:id`
- `/api/invoices`
- `/api/invoices/:id`
- `/api/invoices/:id/pdf`

PDF generation runs in the Vercel Node.js function for the PDF route.

## Local

Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://...
```

Then:

```bash
npm install
npm run dev
```
