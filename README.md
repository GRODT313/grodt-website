# Get Ripped Or Die Trying

Official website for GRODT, a fitness apparel brand based in Detroit, MI.

## Structure

- `index.html` — shop, lookbook, story, contact, email signup
- `success.html` — post-checkout confirmation
- `css/styles.css` — styles
- `js/script.js` — cart, Stripe checkout, contact form
- `api/create-checkout-session.js` — Vercel serverless Stripe Checkout
- `assets/` — logo and photography

## Products

| Product | Price |
| --- | --- |
| Launch Special: set with sleeved or sleeveless t-shirt (first 50 customers) | $100 per set |
| GRODT Cut-Off Hoodie | $75 |
| GRODT Oversized T-Shirt | $60 |
| GRODT Oversized Cut-Off T-Shirt | $60 |
| GRODT Shorts | $65 |

Free US shipping on orders $75+.

## Checkout (Stripe)

Checkout uses Stripe Checkout Sessions. Prices are validated on the server — the cart cannot invent its own prices.

1. Create a Stripe account at [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Copy your **Secret key** (`sk_test_...` for testing, `sk_live_...` for real payments)
3. In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | your Stripe secret key |

4. Redeploy the project after adding the variable
5. Test with Stripe test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

Local checkout testing:

```bash
npm install
npx vercel env pull .env.local
npx vercel dev
```

## Contact form

The contact form and newsletter signup send messages to **mal@getrippedodt.com** through FormSubmit.

The first time someone submits, FormSubmit emails that address asking you to confirm it. Click the confirmation link once so messages start arriving.

## Deploy on Vercel

1. Import the `GRODT313/grodt-website` GitHub repo
2. Framework Preset: **Other**
3. Build Command: `npm run build` (optional no-op)
4. Output Directory: leave blank / `.`
5. Add `STRIPE_SECRET_KEY` as above
6. Deploy

## Run locally (static only)

Without Vercel/Stripe API routes, browsing and the cart still work; Checkout needs `vercel dev` or a deployed URL.

```bash
npm start
```

Then visit http://localhost:8080
