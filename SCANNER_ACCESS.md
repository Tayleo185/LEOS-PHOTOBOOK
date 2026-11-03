# Delivery scanner access fix — 7.7

The company overview now includes the delivery photo scanner directly. Its quick action says Scan delivery instead of Document. Documents includes the scanner plus Analyze delivery photo on saved images, using the existing authorized file_url API and the same completion pipeline. Generic document upload continues storing files only. The overview pay badge reflects load-specific pay settings when uniform, rather than the company default. No existing loads are assumed completed and no database values are changed during deployment.

47 automated tests pass. Synthetic full-company UI checked the overview scanner, saved-photo analysis and report updates. Existing company loads were read for diagnosis: both remained scheduled. Delivery evidence is still required; a scheduled delivery date alone never completes a load.
