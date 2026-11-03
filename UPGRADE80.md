# Leo 8.0 — mobile, installments and document matching

## What changed
- Drawer navigation at phone/Fold widths through 1000 CSS pixels, 44px controls, readable 16px form fields, single-column narrow forms, a Close menu control and Escape support. Closed drawers are inert.
- Owners, admins and bookkeepers can record full payments, partial installments or invoice deposits already received outside Leo. Enter the actual amount/date/method/reference and verify receipt. Each installment reduces the source balance and is retry-safe. Bills also support installments. Load collections retain earned revenue once and use actual collection dates. The load pay total freezes at first collection so changing the company default share cannot change its remaining balance.
- Invoice receipts and bill payments have separate linked financial entries. Paid/partially paid sources and linked entries are locked. Overpayment, fractional cents, stale versions, changed retry details, cross-company access, nonfinancial roles and read-only companies are rejected. Old full-payment paths reject partially collected sources.
- Overview and Documents now read image documents with browser OCR, classify likely invoices/receipts/settlements/delivery paperwork, suggest exact-reference matches, and flag ambiguous or missing information. Receipt suggestions without a reference require the saved vendor, exact total and ISO date to match. You must confirm attachment. An identical image already linked to that record is detected by its SHA-256 filename. Delivery completion remains a separate evidence-checked flow. OCR cannot verify authenticity or payment.

## Use
Open Payments, choose Confirm payment received (or Confirm bill paid), enter only the amount actually received/paid, choose payment type and confirm. For a deposit, create/review the final invoice amount first; confirmed sources are locked to preserve payment history. A deposit is recorded as income in the existing cash-oriented reports; this release is not an escrow or deferred-revenue accounting ledger. Ask your accountant about required accounting treatment.

Open Overview or Documents > Read and match a document to scan a JPG, PNG or WebP up to 10MB. Review the proposed record, then Confirm match & attach photo. No financial amounts or payment statuses are inferred from a receipt image. PDFs can be stored but are not OCR-read. Load all records before document matching.

## Validation and limits
62 Node tests pass, including remaining balances, payment-month cash movement, API validation and document ambiguity. Real Supabase transaction tests cover deposit/final invoice payments, bill installments, load installments without duplicate income, frozen pay share, idempotence, overpayment, stale versions, roles and company isolation. All SQL test fixtures roll back. Existing full-payment regression SQL also passes.

Synthetic browser checks cover $500 invoice -> $100 deposit -> $400 balance -> final payment, real OCR of a generated sample invoice, reviewed attachment, repeat-image detection, and 390px navigation/layout. The HTTP preview uses a sample-only hash adapter; production HTTPS uses native SHA-256. No customer records or real payments were changed in testing.

No card charging, payment links, bank verification, refunds, customer messaging or automatic PDF extraction is enabled. Original personal toolkit and Supabase records/receipt objects remain intact. No database is deleted or replaced. Security advisors retain the pre-existing leaked-password protection warning; new RPCs remain service-role only and authorize the verified actor internally.
