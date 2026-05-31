# Entity-Relationship Model

## ER diagram (core domain)

```mermaid
erDiagram
  businesses ||--o{ users : employs
  businesses ||--|| business_settings : configures
  businesses ||--o{ customers : serves
  businesses ||--o{ inventory_items : stocks

  customers ||--o{ devices : owns
  customers ||--o{ repair_tickets : requests
  customers o|--o| users : portal_account

  devices ||--o{ repair_tickets : subject_of

  repair_tickets ||--o{ ticket_timeline : logs
  repair_tickets ||--o{ ticket_internal_notes : has
  repair_tickets ||--o{ ticket_photos : has
  repair_tickets ||--o{ quotations : quoted
  repair_tickets ||--o| invoices : billed
  repair_tickets ||--o{ warranties : covered

  users ||--o{ repair_tickets : assigned

  quotations ||--o{ quotation_lines : contains

  inventory_items ||--o{ quotation_lines : may_reference
  inventory_items ||--o{ stock_movements : tracked

  suppliers ||--o{ purchase_orders : supplies
  purchase_orders ||--o{ purchase_order_lines : contains

  invoices ||--o{ invoice_lines : contains
  invoices ||--o{ payments : paid_by
  payments ||--o{ refunds : may_have

  warranties ||--o{ warranty_claims : claims

  service_types ||--o{ appointments : books

  businesses ||--o{ notification_templates : templates
  businesses ||--o{ activity_log : audits
```

## Relationship summary

| Parent | Child | Cardinality | On delete |
|--------|-------|-------------|-----------|
| business | users | 1:N | CASCADE |
| business | customers | 1:N | CASCADE |
| customer | devices | 1:N | CASCADE |
| customer | repair_tickets | 1:N | RESTRICT |
| device | repair_tickets | 1:N | RESTRICT |
| repair_ticket | quotations | 1:N | CASCADE |
| repair_ticket | invoice | 1:0..1 | SET NULL |
| quotation | quotation_lines | 1:N | CASCADE |
| invoice | payments | 1:N | RESTRICT |

## Key constraints

- `repair_tickets(business_id, ticket_number)` UNIQUE
- `inventory_items(business_id, sku)` UNIQUE
- `users(business_id, email)` UNIQUE
- Ticket status transitions validated in application layer
- `quantity_on_hand` never negative (CHECK or service guard)

## Indexes (performance)

| Table | Index | Purpose |
|-------|-------|---------|
| repair_tickets | (business_id, status) | Dashboard filters |
| repair_tickets | (business_id, created_at DESC) | Recent list |
| customers | GIN trigram | Search |
| inventory_items | partial low stock | Alerts |
| activity_log | (business_id, created_at DESC) | Feed |
| appointments | (business_id, scheduled_start) | Calendar |

## Portal tracker mapping

| DB `ticket_status` | Customer tracker step |
|--------------------|------------------------|
| new | Received |
| diagnosing | Diagnosing |
| waiting_approval | Awaiting Approval |
| waiting_parts | Repairing |
| repairing | Repairing |
| testing | Testing |
| ready_for_pickup | Ready |
| completed | (hidden / archived) |
| cancelled | Cancelled banner |
