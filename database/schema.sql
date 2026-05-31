-- Sunset Country Tech ERP — PostgreSQL Schema
-- Multi-tenant ready: all business data scoped by business_id
-- Version: 1.0.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'owner', 'manager', 'technician', 'sales', 'customer'
);

CREATE TYPE ticket_status AS ENUM (
  'new', 'diagnosing', 'waiting_approval', 'waiting_parts',
  'repairing', 'testing', 'ready_for_pickup', 'completed', 'cancelled'
);

CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'void', 'refunded');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');

CREATE TYPE photo_stage AS ENUM ('before', 'during', 'after');

CREATE TYPE notification_channel AS ENUM ('email', 'sms');

CREATE TYPE notification_trigger AS ENUM (
  'ticket_created', 'quote_ready', 'quote_approved',
  'device_ready', 'warranty_expiring', 'appointment_reminder'
);

CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

CREATE TYPE po_status AS ENUM ('draft', 'ordered', 'partial', 'received', 'cancelled');

CREATE TYPE warranty_claim_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected', 'resolved');

-- =============================================================================
-- TENANCY & AUTH
-- =============================================================================

CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  legal_name      VARCHAR(255),
  abn             VARCHAR(20),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address_line1   VARCHAR(255),
  address_line2   VARCHAR(255),
  city            VARCHAR(100),
  state           VARCHAR(50),
  postcode        VARCHAR(20),
  country         VARCHAR(2) DEFAULT 'AU',
  timezone        VARCHAR(50) DEFAULT 'Australia/Melbourne',
  currency        CHAR(3) DEFAULT 'AUD',
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  role            user_role NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, email)
);

CREATE INDEX idx_users_business ON users(business_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role            user_role NOT NULL,
  permission      VARCHAR(100) NOT NULL,
  UNIQUE (role, permission)
);

CREATE TABLE business_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  branding_json   JSONB DEFAULT '{}',
  email_settings  JSONB DEFAULT '{}',
  sms_settings    JSONB DEFAULT '{}',
  tax_rate        DECIMAL(5,4) DEFAULT 0.1000,
  ticket_prefix   VARCHAR(10) DEFAULT 'RCT',
  next_ticket_seq INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- CUSTOMERS & DEVICES
-- =============================================================================

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  address_line1   VARCHAR(255),
  address_line2   VARCHAR(255),
  city            VARCHAR(100),
  state           VARCHAR(50),
  postcode        VARCHAR(20),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_name ON customers(business_id, name);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;

CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  manufacturer    VARCHAR(100) NOT NULL,
  model           VARCHAR(150) NOT NULL,
  imei            VARCHAR(20),
  serial_number   VARCHAR(100),
  colour          VARCHAR(50),
  passcode_provided VARCHAR(100),
  purchase_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_customer ON devices(customer_id);
CREATE INDEX idx_devices_imei ON devices(imei) WHERE imei IS NOT NULL;

-- =============================================================================
-- REPAIR TICKETS
-- =============================================================================

CREATE TABLE repair_tickets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ticket_number       VARCHAR(30) NOT NULL,
  customer_id         UUID NOT NULL REFERENCES customers(id),
  device_id           UUID NOT NULL REFERENCES devices(id),
  assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  issue_description   TEXT NOT NULL,
  diagnostic_notes    TEXT,
  priority            ticket_priority NOT NULL DEFAULT 'normal',
  status              ticket_status NOT NULL DEFAULT 'new',
  customer_notes      TEXT,
  estimated_completion TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  created_by_id       UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, ticket_number)
);

CREATE INDEX idx_tickets_business_status ON repair_tickets(business_id, status);
CREATE INDEX idx_tickets_technician ON repair_tickets(assigned_technician_id);
CREATE INDEX idx_tickets_customer ON repair_tickets(customer_id);
CREATE INDEX idx_tickets_created ON repair_tickets(business_id, created_at DESC);

CREATE TABLE ticket_timeline (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  from_status     ticket_status,
  to_status       ticket_status NOT NULL,
  note            TEXT,
  created_by_id   UUID REFERENCES users(id),
  is_customer_visible BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_ticket ON ticket_timeline(ticket_id, created_at);

CREATE TABLE ticket_internal_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  storage_key     TEXT NOT NULL,
  url             TEXT NOT NULL,
  stage           photo_stage NOT NULL,
  caption         VARCHAR(255),
  uploaded_by_id  UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- QUOTATIONS
-- =============================================================================

CREATE TABLE quotations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  quote_number    VARCHAR(30) NOT NULL,
  status          quote_status NOT NULL DEFAULT 'draft',
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  valid_until     DATE,
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by_id   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, quote_number)
);

CREATE TABLE quotation_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  line_type       VARCHAR(20) NOT NULL CHECK (line_type IN ('labour', 'parts')),
  description     VARCHAR(255) NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL,
  inventory_item_id UUID,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

-- =============================================================================
-- INVENTORY
-- =============================================================================

CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  contact_name    VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(50) NOT NULL,
  UNIQUE (business_id, slug)
);

CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES inventory_categories(id),
  sku             VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  barcode         VARCHAR(50),
  unit_cost       DECIMAL(12,2) DEFAULT 0,
  unit_price      DECIMAL(12,2) DEFAULT 0,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_level   INTEGER NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, sku)
);

CREATE INDEX idx_inventory_low_stock ON inventory_items(business_id)
  WHERE quantity_on_hand <= reorder_level AND is_active = true;

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  po_number       VARCHAR(30) NOT NULL,
  status          po_status NOT NULL DEFAULT 'draft',
  ordered_at      TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, po_number)
);

CREATE TABLE purchase_order_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_ordered  INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost       DECIMAL(12,2) NOT NULL
);

CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  movement_type   VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'purchase', 'sale', 'repair_consumption', 'adjustment', 'return'
  )),
  quantity        INTEGER NOT NULL,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  notes           TEXT,
  created_by_id   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INVOICING & PAYMENTS
-- =============================================================================

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  ticket_id       UUID REFERENCES repair_tickets(id),
  invoice_number  VARCHAR(30) NOT NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid     DECIMAL(12,2) NOT NULL DEFAULT 0,
  issued_at       TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, invoice_number)
);

CREATE TABLE invoice_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     VARCHAR(255) NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12,2) NOT NULL,
  inventory_item_id UUID
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id),
  amount          DECIMAL(12,2) NOT NULL,
  method          payment_method NOT NULL,
  reference       VARCHAR(100),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id   UUID REFERENCES users(id)
);

CREATE TABLE refunds (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id      UUID NOT NULL REFERENCES payments(id),
  amount          DECIMAL(12,2) NOT NULL,
  reason          TEXT,
  refunded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id   UUID REFERENCES users(id)
);

-- =============================================================================
-- WARRANTY
-- =============================================================================

CREATE TABLE warranties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  device_id       UUID NOT NULL REFERENCES devices(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  covered_components TEXT NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warranties_expiry ON warranties(business_id, end_date);

CREATE TABLE warranty_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  warranty_id     UUID NOT NULL REFERENCES warranties(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  description     TEXT NOT NULL,
  status          warranty_claim_status NOT NULL DEFAULT 'submitted',
  resolution_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================

CREATE TABLE service_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id),
  service_type_id UUID NOT NULL REFERENCES service_types(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end   TIMESTAMPTZ NOT NULL,
  status          appointment_status NOT NULL DEFAULT 'scheduled',
  customer_name   VARCHAR(255),
  customer_email  VARCHAR(255),
  customer_phone  VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_schedule ON appointments(business_id, scheduled_start);

-- =============================================================================
-- TICKET COMMUNICATIONS
-- =============================================================================

CREATE TABLE ticket_communications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  ticket_id       UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'system')),
  direction       VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  message_type    VARCHAR(50) NOT NULL DEFAULT 'message',
  status          VARCHAR(30) NOT NULL DEFAULT 'stored',
  sender          VARCHAR(255),
  recipient       VARCHAR(255),
  subject         VARCHAR(255),
  body_text       TEXT,
  body_html       TEXT,
  attachments     JSONB DEFAULT '[]',
  provider_message_id VARCHAR(255),
  in_reply_to     VARCHAR(255),
  error_message   TEXT,
  created_by_id   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comms_ticket ON ticket_communications(ticket_id, created_at);

CREATE TABLE unassigned_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel         VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms')),
  sender          VARCHAR(255),
  recipient       VARCHAR(255),
  subject         VARCHAR(255),
  body_text       TEXT,
  body_html       TEXT,
  attachments     JSONB DEFAULT '[]',
  provider_message_id VARCHAR(255),
  received_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unassigned_messages_business ON unassigned_messages(business_id, created_at);

-- =============================================================================
-- POS
-- =============================================================================

CREATE TABLE pos_sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number     VARCHAR(30) NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  subtotal        DECIMAL(12,2) NOT NULL,
  tax_amount      DECIMAL(12,2) NOT NULL,
  total           DECIMAL(12,2) NOT NULL,
  payment_method  payment_method NOT NULL,
  created_by_id   UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, sale_number)
);

CREATE TABLE pos_sale_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pos_sale_id     UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity        INTEGER NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notification_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  trigger         notification_trigger NOT NULL,
  channel         notification_channel NOT NULL,
  subject         VARCHAR(255),
  body_template   TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, trigger, channel)
);

CREATE TABLE notification_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipient       VARCHAR(255) NOT NULL,
  channel         notification_channel NOT NULL,
  trigger         notification_trigger,
  subject         VARCHAR(255),
  body            TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ACTIVITY & AUDIT
-- =============================================================================

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_business ON activity_log(business_id, created_at DESC);

-- =============================================================================
-- TRIGGERS: updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON repair_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
