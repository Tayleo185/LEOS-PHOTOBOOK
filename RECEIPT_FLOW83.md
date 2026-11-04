# Leo 8.3 — Finish the receipt workflow

A saved photo is not necessarily a recorded expense. Version 8.2 incorrectly suppressed receipt drafts whenever the image already existed, even if it was not linked to any record. Photos attached to a different expense were also treated as already recorded. This release checks the linked financial record's amount, purchase date and type before suppressing a new receipt draft. Mismatched or unresolved links are flagged for review; existing entries are not overwritten. Matching receipts continue to open their existing record instead of another draft.

Uploading an image through Upload document now starts receipt reading automatically for financial roles. A new receipt opens the review form directly; missing merchant/date fields are explicit. The user reviews and saves the expense to update bookkeeping. PDF uploads remain document storage only. Saved receipt photos can still be read from Documents.

Validation: 84 Node tests, including stored-but-unlinked, mismatched-link and already-recorded cases. A private browser preview exercised the exact Upload document path with a supplied receipt: private photo storage, authorized read, automatic expense review and saved entry with attachment. Private uploaded images and OCR transcriptions are excluded from this source archive. Existing production records and receipt/file relationships are preserved.

No Supabase migration or server-function replacement is needed. Frontend assets are app83.mjs and document-match83.mjs; existing 82/80/79 dependency assets remain in the repository.
