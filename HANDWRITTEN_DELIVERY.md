# Handwritten delivery form handling — 7.8

The real photo test reproduced a Q-versus-zero reference mismatch and unreadable handwritten delivery fields. Matching now preserves a unique possible load when one character is a known OCR lookalike (Q/0, O/0, I/1, L/1, S/5, B/8). Such a match NEVER completes automatically, regardless of confidence. Ambiguous candidates are not selected. A low-confidence exact match also retains its load for review. Missing/invalid confidence cannot allow automatic completion.

For matching BOL/POD forms with delivery-date and signature/name labels and existing positive pay, the company scanner offers an explicit Confirm [load number] delivered & update totals button. Clicking attaches the original image privately, version-checks the existing record and recalculates the existing report totals. Paid status and saved gross rate are never inferred from handwriting. Clear exact matches still use the existing automatic path. A generic BOL alone is never automatically declared delivered.

51 automated tests pass. The exact user-provided image was tested with real browser Tesseract OCR in a private local fixture: its Q was recognized as 0; the correct saved-load candidate and confirmation were shown. Clicking confirmation updated only the synthetic company, including earned/unpaid pay, profit and tax target. Private photos, OCR output and fixture data are excluded from this source archive and from GitHub. No production load was marked completed during testing.

Saved-image analysis now awaits the processor so private-download errors reach the existing visible error handler. Runtime entrypoints and changed modules have versioned filenames.
