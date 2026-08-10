# GRODT Launch Checklist

Production readiness audit completed on August 10, 2026.

## Summary

| Area | Result |
| --- | --- |
| Security | Fixed |
| Performance / images | Fixed |
| SEO / metadata | Fixed |
| Accessibility | Fixed |
| Responsiveness / mobile UX | Passed (with a11y upgrades) |
| Cross-browser basics | Passed |
| Broken links / assets | Passed |
| JavaScript / pricing logic | Fixed + tested |
| GitHub Actions | Fixed locally; push blocked until `workflow` scope granted |
| Vercel deployment config | Fixed |

## Detailed results

### Security
| Check | Status | Notes |
| --- | --- | --- |
| No secrets committed | Passed | `.env*` ignored; only `.env.example` present |
| Stripe key not exposed to client | Fixed | Public `/api/health` no longer returns key prefix/length |
| Cart XSS via `innerHTML` | Fixed | Cart rendering now HTML-escapes dynamic values |
| API CORS wildcard | Fixed | Restricted to production + localhost + `*.vercel.app` |
| Generic Stripe errors to clients | Fixed | Auth/key failures no longer echo Stripe raw messages |
| Security headers | Fixed | HSTS, CSP, nosniff, frame deny, referrer, permissions via `vercel.json` |
| Request size limits | Fixed | Checkout payload/item count capped |

### Performance / images
| Check | Status | Notes |
| --- | --- | --- |
| Correct image Content-Types | Fixed | Mislabeled JPEG-as-`.png` photos converted to `.jpg` |
| Logo / favicon weight | Fixed | Added `favicon.png`, `apple-touch-icon.png`, `grodt-logo-nav.png`; shrunk logo |
| Hero preload | Fixed | Preload + `fetchpriority="high"` |
| Script loading | Fixed | `defer` on main script |
| Long cache for assets | Fixed | `/assets/*` immutable cache headers |

### SEO / metadata
| Check | Status | Notes |
| --- | --- | --- |
| Title + description | Passed | Present |
| Canonical URL | Fixed | Added |
| Open Graph / Twitter cards | Fixed | Added |
| JSON-LD Store schema | Fixed | Added |
| `robots.txt` | Fixed | Added |
| `sitemap.xml` | Fixed | Added |
| Custom `404.html` | Fixed | Added |

### Accessibility / mobile UX
| Check | Status | Notes |
| --- | --- | --- |
| Skip link | Fixed | Added |
| Focus styles | Fixed | `:focus-visible` |
| Cart dialog semantics | Fixed | `role="dialog"`, `aria-modal` |
| Size `aria-pressed` | Fixed | Wired in JS |
| Viewport / responsive CSS | Passed | Existing breakpoints retained |
| Reduced motion | Passed | Existing support retained |

### JavaScript / checkout
| Check | Status | Notes |
| --- | --- | --- |
| First 50 pricing | Passed | Unit tests cover tee+shorts deal and hoodie exclusion |
| Broken asset refs | Passed | Static checker verified 144 local refs |
| Syntax check | Passed | API, lib, and browser script parse cleanly |

### CI / deploy
| Check | Status | Notes |
| --- | --- | --- |
| GitHub Actions workflow | Fixed | `.github/workflows/ci.yml` runs build, pricing tests, site audit, syntax checks |
| Vercel output directory | Passed | `public` |
| Reproducible installs | Fixed | `package-lock.json` generated |

## Manual launch steps (still required)

These cannot be completed from the repo alone:

1. **Stripe live key** — set `STRIPE_SECRET_KEY=sk_live_...` in Vercel Production, then redeploy without cache.
2. **Verify health** — `https://getrippedodt.com/api/health` should return `"stripeConfigured": true`.
3. **Test checkout** — place a small live or test-mode order end to end.
4. **FormSubmit** — confirm `mal@getrippedodt.com` activation email if not already done.
5. **DNS** — confirm apex/`www` both resolve to Vercel and show Valid in Domains.
6. **Disable Deployment Protection** on Production if preview auth is still blocking public URLs.
7. **Watch first real order** — shipping, Stripe payout settings, and refund flow.

## Commands

```bash
npm install
npm run check
```
