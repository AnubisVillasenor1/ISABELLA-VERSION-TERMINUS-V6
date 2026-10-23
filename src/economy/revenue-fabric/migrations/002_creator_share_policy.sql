-- Revenue Fabric policy v5: creator attribution and integer minor-unit storage.
-- Existing rows are preserved as legacy_major; new rows are written as minor_v2.
ALTER TABLE revenue_settlements
  ADD COLUMN IF NOT EXISTS creator_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS creator_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount_unit TEXT NOT NULL DEFAULT 'legacy_major';

COMMENT ON COLUMN revenue_settlements.amount_unit IS
  'legacy_major preserves the historical storage convention; minor_v2 stores every monetary amount as integer minor units.';
COMMENT ON COLUMN revenue_settlements.creator_eligible IS
  'True only when server-resolved paid plan, active status, and creator identity were present at settlement time.';
COMMENT ON COLUMN revenue_settlements.creator_id IS
  'Creator identity associated with an eligible share. Null for platform-only or ineligible settlements.';
