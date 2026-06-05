-- Align an existing Sunset Repair database with schema.sql v2.
-- Safe to run more than once. This is for databases created before the
-- customer name split, document templates, and mobile workflow fields.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_type') THEN
    CREATE TYPE appointment_type AS ENUM ('home_visit', 'business_visit', 'pickup', 'delivery');
  END IF;
END
$$;

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'booked';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'travelling';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'collected';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'awaiting_approval';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'ready_for_return';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'delivered';

ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS quote_template_json JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invoice_template_json JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sms_settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS alt_address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alt_address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alt_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alt_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS alt_postcode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gps_lat VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gps_lng VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gate_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS property_notes TEXT,
  ADD COLUMN IF NOT EXISTS contact_instructions TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'name'
      AND table_schema = 'public'
  ) THEN
    EXECUTE $sql$
      UPDATE customers
      SET
        first_name = COALESCE(NULLIF(split_part(name, ' ', 1), ''), 'Customer'),
        last_name = COALESCE(NULLIF(btrim(regexp_replace(name, '^\S+\s*', '')), ''), 'Unknown')
      WHERE first_name IS NULL OR last_name IS NULL
    $sql$;
  END IF;
END
$$;

UPDATE customers
SET
  first_name = COALESCE(NULLIF(first_name, ''), 'Customer'),
  last_name = COALESCE(NULLIF(last_name, ''), 'Unknown')
WHERE first_name IS NULL
   OR last_name IS NULL
   OR first_name = ''
   OR last_name = '';

ALTER TABLE customers
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(business_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) NOT NULL DEFAULT 'mobile_phone',
  ADD COLUMN IF NOT EXISTS colour VARCHAR(50),
  ADD COLUMN IF NOT EXISTS passcode_provided VARCHAR(100),
  ADD COLUMN IF NOT EXISTS accessories_received JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS warranty_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS purchase_date DATE;

ALTER TABLE repair_tickets
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS service_address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS service_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_postcode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS service_gps_lat VARCHAR(20),
  ADD COLUMN IF NOT EXISTS service_gps_lng VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gate_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS property_notes TEXT,
  ADD COLUMN IF NOT EXISTS contact_instructions TEXT,
  ADD COLUMN IF NOT EXISTS appointment_type appointment_type,
  ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(10),
  ADD COLUMN IF NOT EXISTS pickup_signature TEXT,
  ADD COLUMN IF NOT EXISTS return_signature TEXT,
  ADD COLUMN IF NOT EXISTS pickup_receipt_pdf TEXT,
  ADD COLUMN IF NOT EXISTS return_receipt_pdf TEXT,
  ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tickets_business_status ON repair_tickets(business_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON repair_tickets(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON repair_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON repair_tickets(business_id, created_at DESC);
