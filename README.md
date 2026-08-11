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

## Michigan sales tax (Stripe Tax)

Checkout has automatic tax enabled. Stripe calculates and collects Michigan sales tax (6%) on orders shipped to Michigan once Stripe Tax is activated in the Dashboard. Until then, checkout still works but collects no tax.

One-time Dashboard setup (about 5 minutes):

1. Go to [https://dashboard.stripe.com/tax](https://dashboard.stripe.com/tax) and click **Get started** / **Activate Stripe Tax**
2. Confirm the **origin address** (your Michigan business address)
3. When asked for a default product tax category, pick **Clothing & Footwear** (the code also sets this per product, so this is just a fallback)
4. Under **Registrations**, click **Add registration** → United States → **Michigan**, enter the start date from your Michigan Sales Tax license, and save

Notes:

- Adding the registration in Stripe only tells Stripe to start collecting. Your actual license with the State of Michigan is what makes it legal — you have that already.
- Stripe collects the tax with each payment but does **not** file your Michigan return. File through [Michigan Treasury Online](https://mto.treasury.michigan.gov/) using the Dashboard report at **Tax → Reports** (or add Stripe's paid filing product).
- Orders shipped to other states collect no tax, which is correct until you register in those states. Stripe's **Tax → Monitoring** page warns you if you're approaching another state's threshold.

## Order fulfillment (dropshipping)

When a customer completes checkout, `api/stripe-webhook.js` emails **mal@getrippedodt.com** with the full order: items, sizes, total paid, and the customer's shipping address and phone.

One-time setup in Stripe (do this in live mode):

1. Go to **Developers → Webhooks → Add endpoint** ([dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks))
2. Endpoint URL: `https://getrippedodt.com/api/stripe-webhook`
3. Select a single event: **checkout.session.completed**
4. Save. No signing secret needs to be copied anywhere — the endpoint verifies orders by re-fetching them from Stripe.

Fulfillment workflow for each order email:

1. Order the items from your supplier, shipped to **your own address**
2. When they arrive, inspect them, then package and ship to the **customer ship-to address** from the order email
3. Email the customer their tracking number (their email is in the order email)
4. Keep the total supplier-transit plus your ship-out time inside the 3–6 week window from the shipping policy

Backup: in Stripe → your profile → **Notification preferences**, turn on emails for successful payments so you're covered even if the webhook is ever down.

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
