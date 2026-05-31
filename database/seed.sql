-- Demo seed for local development
-- Password: ChangeMe123! (bcrypt hash below is placeholder — run backend seed script for real hash)

INSERT INTO businesses (id, name, slug, email, phone, city, state, postcode)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Sunset Country Tech',
  'sunset-demo',
  'hello@sunsetcountry.tech',
  '03 5000 0000',
  'Mildura',
  'VIC',
  '3500'
);

INSERT INTO business_settings (business_id, ticket_prefix, next_ticket_seq, tax_rate)
VALUES ('a0000000-0000-4000-8000-000000000001', 'SCT', 1001, 0.1000);

INSERT INTO inventory_categories (id, business_id, name, slug) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Screens', 'screens'),
  ('b1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Batteries', 'batteries'),
  ('b1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Accessories', 'accessories');

INSERT INTO service_types (id, business_id, name, duration_minutes) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Screen Repair Consultation', 30),
  ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Battery Replacement', 45),
  ('c1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'General Diagnostic', 60);

INSERT INTO notification_templates (business_id, trigger, channel, subject, body_template) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'ticket_created', 'email',
   'Repair received — {{ticket_number}}',
   'Hi {{customer_name}}, we have received your {{device_model}}. Track progress: {{portal_link}}'),
  ('a0000000-0000-4000-8000-000000000001', 'device_ready', 'sms', NULL,
   'Your device is ready for pickup! Ticket {{ticket_number}}. {{business_name}}');
