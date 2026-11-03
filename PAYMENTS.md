# Payment confirmation — Version 7.9

Owners, admins and bookkeepers can confirm full payments already received outside Leo from Payments. Choose the actual payment date, method and optional reference, then verify the full amount. No money moves and no bank deposit is independently verified.

Customer invoices create one linked income entry. Bills create one linked expense entry. Completed loads become paid without adding earned income twice. Completed priced appointments can prepare one invoice for review before confirmation. Review final charges and taxes first.

Confirmation is atomic and retry-safe. The server verifies identity, company membership, role, writable company status and record version. Confirmed payment records cannot be edited or archived through the normal record editor. Cross-company and driver attempts are rejected.

Payment history and load cash collection use the actual payment date. Earned load revenue retains its original reporting date. Legacy entries without a payment date fall back to their record date. Tax reserve is a configurable savings estimate, not withheld tax.

Partial payments, deposits, refunds, card charging and automatic bank verification are not enabled. Original Supabase records and receipt storage are preserved.

Validation: 56 Node tests, rollback-only SQL isolation/idempotence tests, and synthetic browser flows for invoice and appointment payment confirmation.
