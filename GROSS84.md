# Gross calendar summaries — 8.4

Company Overview adds week-to-date (Monday start), month-to-date and calendar-year-to-date gross through the device local date, independent of the existing selected month. Completed/paid loads contribute their full saved rate; received income contributes once. Archived, scheduled and future records, open invoices, owner contributions and expenses are excluded. Trucking cards also show company earned share plus income using existing revenue calculations. Dates use the saved record date, consistent with existing reports. No database write or schema change is performed. Totals cover accessible loaded company records; the existing pagination warning still applies.

85 automated tests pass, including period/year boundaries, carrier share and exclusion cases. Browser layout verified using synthetic data. No private receipts, OCR text or financial data are bundled.
