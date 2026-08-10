# Get Ripped Or Die Trying

Official website for GRODT, a fitness apparel brand.

## Structure

- `public/` — static site (HTML, CSS, JS, images)
- `public/index.html` — shop, lookbook, story, contact, email signup
- `public/success.html` — post-checkout confirmation
- `api/create-checkout-session.js` — Vercel serverless Stripe Checkout
- `vercel.json` — Output Directory set to `public`

## Products

| Product | Price |
| --- | --- |
| First 50 Set: Oversized T-Shirt or Oversized Cut-Off T-Shirt + Shorts | $100 |
| GRODT Cut-Off Hoodie | $75 (not part of First 50 deal) |
| GRODT Oversized T-Shirt | $60 |
| GRODT Oversized Cut-Off T-Shirt | $60 |
| GRODT Shorts | $65 |

First 50 deal is applied automatically in cart/checkout when a qualifying tee and shorts are both in the cart. Limited to 50 completed set purchases. Free US shipping on orders $75+.

## Checkout (Stripe)

Checkout uses Stripe Checkout Sessions. Prices are validated on the server — the cart cannot invent its own prices.

1. Create a Stripe account at [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Copy your **Secret key** (`sk_test_...` for testing, `sk_live_...` for real payments)
3. In Vercel → Project → Settings → Environment Variables, add:

| Name | Value | Environments |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | your Stripe secret key (`sk_test_...` or `sk_live_...`) | **Production** (and Preview if you want) |

4. **Redeploy is required** after adding or editing env vars. Deployments → ⋯ → Redeploy → turn off “Use existing Build Cache”
5. Confirm the key is live: open `https://getrippedodt.com/api/health` — `stripeConfigured` should be `true`
6. Test with Stripe test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

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
3. Build Command: `npm run build`
4. Output Directory: `public`
5. Add `STRIPE_SECRET_KEY` as above
6. Deploy

## Run locally (static only)

Without Vercel/Stripe API routes, browsing and the cart still work; Checkout needs `vercel dev` or a deployed URL.

```bash
npm start
```

Then visit http://localhost:8080


## Production checks

```bash
npm install
npm run check
```

See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for the full launch audit.
