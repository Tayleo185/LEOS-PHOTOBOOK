# Trip Planner 7.2 — draft integration status

This release is a foundation for BOL-driven dispatch, not a complete autonomous trip planner.

Implemented:
- Device-side Tesseract 5.1.1 OCR for a JPG, PNG or WebP BOL photo. PDF users can paste text or photograph pages. Extracted blocks are drafts and require address review.
- Company Trip Planner screen, physical loaded-truck details, a single pickup/delivery leg, HERE truck-route request, rejection of critical routes, street-level geocoding, turn-by-turn instructions.
- Authenticated leos-trip-plan service. Checks Supabase identity itself; verify_jwt=false is required for the publishable-key client. It does not read or write company data. Existing company API controls all saves and file access.
- NWS hourly forecasts covering estimated arrival at five approximate route checkpoints, active alerts, timestamps and explicit per-checkpoint failures. US coverage, drive-time estimates only. Not a continuous corridor hazard guarantee.
- Manual fuel budget and price comparison with detour fuel cost. No fabricated station data or claimed live prices.
- Save a scheduled company load and attach the photo through existing private company storage. Driver assignment is done from Loads. Original personal records, receipts, settings and tables are untouched.
- DAT One / Truckstop external account links. DAT selected by the user; no live listings or booking API are enabled.

Activation still required:
1. HERE_API_KEY in Supabase Edge Function secrets, with Geocoding and Routing v8 access. Do not place a key in HTML, GitHub, chat or a public ZIP. Existing secrets are reused if configured.
2. DAT approved API / TMS certification and account authorization. Do not scrape paid listings or treat an ordinary login as API access. Official docs: https://www.dat.com/api-integration and https://www.dat.com/product-and-delivery-schedule .
3. The name of the user's fuel-card network, its approved current-price API, coverage, timestamps, discount terms, and secure server credentials. No source has been connected yet.
4. A feasible, location-aware multi-stop fuel optimizer with truck access, arrival fuel, tank capacity, reserve, station hours, detours and price freshness. Current manual comparison is not this optimizer.
5. Driver hours / ELD integration, rest and parking stops, appointment feasibility, multi-stop documents, trailer/commodity-specific restrictions, driver review and refreshed prices/weather. No claim that one BOL contains these missing facts.

Tests: node --test tests/*.test.mjs (25 tests). API tests use isolated provider fixtures; they are not proof of live HERE/DAT/fuel integrations. Browser preview successfully read a synthetic BOL photo using real Tesseract OCR, extracted its two addresses, and checked manual fuel math without a production session. Authenticated production workflow remains to be verified after publication and provider activation.

Deployment: flatten platform runtime assets to repository root as in 7.1; include trips.mjs and trip-domain.mjs. Existing leos-platform is unchanged. The additive leos-trip-plan Edge Function was installed separately; no database migration is required. Do not replace or delete original tables, receipts or buckets.
