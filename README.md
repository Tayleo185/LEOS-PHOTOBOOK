# LEOS PhotoBooks 7.0 — company platform, early access

Production host: https://leos-photobooks.onrender.com

## What works

- Verified Supabase accounts; separate companies; company switcher.
- Owner, administrator, dispatcher, driver and bookkeeper roles.
- Company loads, financial records, trucks, maintenance, inspections and renewal reminders.
- Private company document uploads; short-lived authorized download URLs.
- Email-bound invite links with seven-day expiration and revocation. The owner shares these links; the app does not send invitation emails automatically.
- Reports, CSV export, JSON backup and audit history.
- Optional copying of a user's personal bookkeeping records and references to their existing receipt photos. Originals remain untouched; subsequent edits to copies are independent.
- Owner-only subscription actions, plan limits, signed Stripe webhooks, replay protection, and read-only access after payment issues.
- Platform-owner company/subscription overview. This does not expose tenants' bookkeeping or receipts.

The previous 6.4 app is preserved at `/personal.html`, including personal scanning and advanced route/fuel tools. Company records are a separate workspace; these personal tools do not write to a company workspace.

## Billing state

**Real payments are disabled.** User-approved draft sandbox monthly prices:

| Plan | Test monthly price | Trucks | Members | Stripe sandbox price |
| --- | ---: | ---: | ---: | --- |
| Solo | $29 | 1 | 1 | price_1UXccJJcrRqCKFGxqxaC7eLi |
| Small Fleet | $79 | 5 | 10 | price_1UXccMJcrRqCKFGx9HP3JQqd |
| Fleet | $149 | 25 | 50 | price_1UXccPJcrRqCKFGxnP8lpyz1 |

These prices exist only in LEOS L&L LOGISTICS sandbox `acct_1UXat3JcrRqCKFGx`. They are not approved live prices. No real subscription has been charged or created by this build.

To enable end-to-end sandbox billing, configure the following in Supabase Edge Function **secrets**, never in HTML, GitHub, SQL, chat, or local committed files:

- `STRIPE_SECRET_KEY`: the sandbox secret key.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the sandbox webhook endpoint.
- `STRIPE_PRICE_SOLO_MONTHLY`, `STRIPE_PRICE_SMALL_FLEET_MONTHLY`, `STRIPE_PRICE_FLEET_MONTHLY`: the matching IDs above.
- Optional yearly price variables use the same prefix ending `_YEARLY`. No annual prices have been approved/provisioned.

Webhook endpoint: `https://utlqlskomucibxddvdfl.supabase.co/functions/v1/leos-billing-webhook`
Listen for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
Configure the Stripe customer portal before enabling it. Checkout uses the configured price, and only webhook-confirmed provider state changes entitlements; redirects never grant access.

New workspaces are explicitly marked `preview` and carry no automatic charge. Production checkout stays disabled until server secrets, webhook delivery, approved prices, and end-to-end subscription tests are completed. Keep the sandbox and live environments separate.

## Source and release layout

`company.html` and `platform/` are the readable app source. `index.html` is the same company app entrypoint. `personal.html` preserves 6.4. `supabase/` contains the additive database schema and deployed server functions. `tests/` contains finance/permission tests and disposable transactional SQL isolation tests.

The static release flattens `platform/` assets into the repository root to support GitHub's browser uploader. The runtime release contains `index.html`, `company.html`, `personal.html`, `app.mjs`, `domain.mjs`, `style.css`, `icon.svg`, and `manifest.webmanifest`. The source archive preserves the full structured project, server functions, tests and documentation. No server secrets are included.

## Verification

Run `node --test tests/*.test.mjs`. `tests/isolation.sql` runs disposable Auth/company fixtures inside a transaction, tests actual RLS visibility and protected privileges, then rolls back every fixture. Do not run it through a migration tool that commits each statement separately.

Before and after deployment, compare counts and digests of the original `leos_records`, `leos_settings`, and original receipt objects. No original tables, policies or buckets are replaced by this release.

## Known scope

This is the first multi-company release. Company documents support private upload and attachment; the company UI does not yet provide OCR extraction or truck routing. Those existing features remain in the separate personal 6.4 toolkit. Dashboard reminders are in-app only. There is no automated tax filing, bank synchronization, payroll processing, email notification delivery, native app-store package, or offline company-write queue.
