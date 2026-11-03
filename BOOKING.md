# Customer booking — Version 7.3

Business owners and administrators open **Appointments** in their company workspace. Add services, staff display profiles and working hours, set the business time zone and booking/cancellation rules, then explicitly enable public booking. The screen provides a company-specific `/book.html?business=...` link.

Customers can browse that business's active services and public staff names without signing in. To confirm a booking, they create or use a free verified-email Supabase account. They do not need to create a company or buy a business subscription. My appointments provides their own booking history, cancellation and rescheduling outside the business's cutoff. No account credentials or access tokens are placed in links.

Implemented:
- Fixed-duration appointments with listed USD prices, 15-minute start intervals, cleanup/travel buffers, weekly staff hours with breaks, time-off blocks, minimum booking notice and up to 90 days of advance availability.
- Customer phone/name, verified account email, and an address when the chosen service requires an onsite visit. Customer data is available only to the customer and company owners/admins through the authenticated API.
- Business day agenda with customer contact details and completed, no-show and cancellation actions. Existing bookings keep their original UTC start time and service/price snapshots when service details or time zone change.
- Transactional booking and rescheduling, retry reference protection, and a PostgreSQL exclusion constraint preventing overlapping reservations for the same staff resource. Buffers count toward occupied time. Original appointments remain reserved if rescheduling fails.
- Explicit publication opt-in. Disabled/unpaid/suspended businesses cannot accept new public bookings. Customers can still request permitted cancellations. Public APIs return only a restricted catalog or open times, never customer records or occupied-event details.

Limits and next phases:
- Confirmations are on screen. Appointment email/SMS delivery, reminders, deposits, payment processing, invoice creation, recurring appointments, external-calendar synchronization, waitlists, route-aware travel calculations and arrival-window dispatch are not implemented.
- All active staff resources offer all active services in this first release. Profiles are booking resources, not user invites or new access grants. Only company owner/admin roles manage the schedule.
- Business calendar is a day agenda, not a month/week drag-and-drop calendar. Customer history is capped at 200 appointments from the last 90 days onward; business date queries are capped at 1,000 appointments across the surrounding UTC range, with an explicit limit message.
- Web booking works in a phone browser; no native app-store release is included. Supabase Auth must allow the production `/book.html` email-verification redirect. Existing company password recovery handles reset links.
- Adding a time-off block that overlaps a confirmed appointment is rejected. Availability edits do not automatically cancel existing appointments.

Backend:
- `supabase/booking-schema.sql` is the additive schema and service-only SQL functions installed on the existing project. No original tables, policies, settings or receipt buckets are changed.
- `supabase/functions/leos-booking` verifies authenticated user identity itself (`verify_jwt=false`) and validates company owner/admin membership. It uses a server-only secret key. Raw booking tables have RLS enabled and no anon/authenticated table grants; all public responses are explicitly filtered by the Edge API.
- `book.html` and `platform/customer-booking.mjs` are the customer page. `platform/scheduling.mjs` is the business UI.

Verification:
- `node --test tests/*.test.mjs`: 33 tests, including identity, tenant authorization, customer-owned listing/cancellation, unpublished pages, working-hour validation and existing financial tests.
- `tests/booking-isolation.sql`: real PostgreSQL tests for working hours, lunch, buffers, idempotent retries, exclusion conflicts, customer ownership, rescheduling, cancellation, blocks, administrator authorization and raw-data/RPC denial. Synthetic Auth/company rows and appointments are all rolled back.
- Browser QA used synthetic fixtures only and successfully exercised booking confirmation, rescheduling, cancellation, service creation and staff-hour setup. Preview fixtures are excluded from the release. Authenticated production QA remains pending frontend publication.
- Original personal records, settings and receipt digests must match before and after publication. No original data is imported or removed by this release.
