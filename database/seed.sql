-- Production bootstrap
-- Run this once after applying schema.sql to create your first business and owner account.
--
-- BEFORE RUNNING:
--   1. Replace all placeholder values marked with <REPLACE_...>
--   2. Generate a bcrypt hash for your password:
--        python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('<YOUR_PASSWORD>'))"
--   3. Choose a unique slug (lowercase, hyphens only, e.g. 'my-repair-shop')

-- ─── Business ────────────────────────────────────────────────────────────────

INSERT INTO businesses (
  id, name, slug, legal_name, abn,
  email, phone,
  address_line1, city, state, postcode, country,
  timezone, currency
) VALUES (
  uuid_generate_v4(),
  '<REPLACE_BUSINESS_NAME>',          -- e.g. 'Sunset Country Tech'
  '<REPLACE_SLUG>',                   -- e.g. 'sunset-country-tech'
  '<REPLACE_LEGAL_NAME>',             -- e.g. 'Sunset Country Tech Pty Ltd'
  '<REPLACE_ABN>',                    -- e.g. '12 345 678 901'
  '<REPLACE_EMAIL>',                  -- e.g. 'hello@yourdomain.com'
  '<REPLACE_PHONE>',                  -- e.g. '03 5000 0000'
  '<REPLACE_ADDRESS>',                -- e.g. '123 Main St'
  '<REPLACE_CITY>',                   -- e.g. 'Mildura'
  '<REPLACE_STATE>',                  -- e.g. 'VIC'
  '<REPLACE_POSTCODE>',               -- e.g. '3500'
  'AU',
  'Australia/Melbourne',
  'AUD'
);

-- ─── Business settings ────────────────────────────────────────────────────────

INSERT INTO business_settings (business_id, ticket_prefix, next_ticket_seq, tax_rate)
SELECT id, '<REPLACE_TICKET_PREFIX>', 1, 0.1000   -- ticket_prefix e.g. 'SCT', tax_rate 0.1 = 10% GST
FROM businesses
WHERE slug = '<REPLACE_SLUG>';

-- ─── Owner account ───────────────────────────────────────────────────────────
-- Generate password hash first (see instructions above)

INSERT INTO users (business_id, email, password_hash, full_name, role, is_active)
SELECT
  id,
  '<REPLACE_OWNER_EMAIL>',
  '<REPLACE_BCRYPT_HASH>',
  '<REPLACE_OWNER_NAME>',
  'owner',
  true
FROM businesses
WHERE slug = '<REPLACE_SLUG>';
