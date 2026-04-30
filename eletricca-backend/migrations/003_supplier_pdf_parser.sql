-- Add optional PDF parser script name to supplier.
-- When set, the server runs python_scripts/supplier_parsers/<pdf_parser>.py
-- to auto-extract prices from a supplier's PDF.
-- When NULL, the generic parser is used.
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS pdf_parser VARCHAR(100);
