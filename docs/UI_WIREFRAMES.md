# UI Design — Wireframes & Navigation

## Design system

| Token | Value |
|-------|--------|
| Primary | Slate 900 / Amber 500 accent (sunset brand) |
| Font | Inter |
| Radius | 0.5rem (ShadCN default) |
| Density | Comfortable (shop floor readability) |

---

## Navigation structure (staff app)

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Sunset Country Tech          🔔  [User ▼]          │
├──────────┬──────────────────────────────────────────────────┤
│ Dashboard│                                                  │
│ Customers│              MAIN CONTENT AREA                    │
│ Tickets  │                                                  │
│ Inventory│                                                  │
│ Invoices │                                                  │
│ Quotes   │                                                  │
│ Appts    │                                                  │
│ POS      │                                                  │
│ Reports  │                                                  │
│ Admin    │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Mobile:** Sidebar collapses to bottom nav (Dashboard, Tickets, Customers, More).

---

## Page: Dashboard

```
┌────────────┬────────────┬────────────┬────────────┐
│ Repairs    │ Revenue    │ In Progress│ Pickup     │
│ Today: 12  │ $4,280     │ 8          │ 3          │
└────────────┴────────────┴────────────┴────────────┘

┌─────────────────────────────┐ ┌──────────────────────┐
│ Low stock (3)               │ │ Technician workload  │
│ • iPhone 13 screen - 2 left │ │ Alex ████████ 6      │
│ • USB-C port - 1 left       │ │ Sam  ████░░░░ 3      │
└─────────────────────────────┘ └──────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Recent activity                                          │
│ 10:42 — Ticket SCT-1042 → Repairing (Alex)              │
│ 10:38 — Quote approved by Jane Smith                     │
└──────────────────────────────────────────────────────────┘
```

---

## Page: Ticket detail

```
SCT-1042  [High]  [Repairing ▼]     Customer: Jane Smith
─────────────────────────────────────────────────────────
Device: iPhone 14 Pro | IMEI: ... | Colour: Space Black

Issue: Cracked screen, touch intermittent
Diagnostic: ...

┌──────────────┐ ┌────────────────────────────────────────┐
│   Timeline   │ │ Tabs: Notes | Photos | Quote | Invoice │
│              │ │                                        │
│ ● Received   │ │ [Internal note input]                  │
│ ● Diagnosing │ │                                        │
│ ○ Approval   │ │ Photos: [Before] [During] [After]      │
│ ● Repairing  │ │                                        │
└──────────────┘ └────────────────────────────────────────┘
```

---

## Customer portal: Repair tracker

Domino's-style horizontal stepper:

```
   ✓          ✓          ●          ○          ○          ○
Received → Diagnosing → Awaiting → Repairing → Testing → Ready
                      Approval
```

- Completed steps: filled amber circle + check
- Current: pulsing ring
- Future: grey outline
- Estimated ready date below stepper
- CTA: "Approve quote" when status = waiting_approval

---

## Page: POS

```
┌─────────────────────────────────────┐
│ Scan barcode: [____________] [🔍]  │
├─────────────────────────────────────┤
│ Cart                                │
│ Tempered glass x1        $25.00    │
│ USB-C cable x1           $19.00    │
├─────────────────────────────────────┤
│ Total: $48.40 (inc GST)             │
│ [Cash] [Card] [Bank]  [Complete]    │
└─────────────────────────────────────┘
```

---

## Page: Appointment booking (public)

```
Book with Sunset Country Tech
Service: [Screen repair consultation ▼]
Date:    [Calendar widget]
Time:    [09:00] [09:30] [10:00] ...
Your details: Name, Email, Phone
[Book appointment]
```

---

## Responsive breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px | Single column; bottom nav |
| 640–1024px | Collapsible sidebar |
| > 1024px | Fixed sidebar 240px |

---

## Accessibility

- Focus rings on all interactive elements
- Status never color-only (icon + label)
- Portal tracker: `aria-current="step"` on active step
- Form errors linked with `aria-describedby`

---

## Key components (implemented in frontend)

| Component | Path |
|-----------|------|
| AppShell | `components/layout/AppShell.tsx` |
| RepairTracker | `components/shared/RepairTracker.tsx` |
| StatusBadge | `components/shared/StatusBadge.tsx` |
| Sidebar | `components/layout/Sidebar.tsx` |
