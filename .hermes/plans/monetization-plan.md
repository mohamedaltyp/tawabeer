# Monetization Implementation Plan — "دورك" SaaS

> **Goal:** Transform the free queue management app into a monetized SaaS with subscription plans, payment processing, and WhatsApp notifications.

**Architecture:** Add `plan` field to shops/owners, create plan limits middleware, offer Vodafone Cash manual payment + Stripe for automated, integrate WhatsApp API for paid-tier notifications.

**Tech Stack:** SQLite (existing), Next.js API routes, Vodafone Cash/Fawry, WhatsApp Business API (Cloud API or direct)

---

## Phase 1: Subscription Foundation (SHIP THIS WEEK)

### Task 1: Add plan fields to database

**Objective:** Add subscription plan tracking to the shops table

**Files:**
- Modify: `src/lib/db.ts`

**Changes:**
Add to `CREATE TABLE IF NOT EXISTS shops`:
- `plan TEXT DEFAULT 'free'` — free, basic, pro, enterprise
- `plan_status TEXT DEFAULT 'active'` — active, expired, cancelled
- `plan_started_at TEXT`
- `plan_expires_at TEXT`
- `stripe_customer_id TEXT DEFAULT ''`
- `stripe_subscription_id TEXT DEFAULT ''`

Add helper functions:
- `getShopPlan(shopId): string`
- `updateShopPlan(shopId, plan, expiresAt): void`
- `isPlanActive(shopId): boolean`
- `getPlanLimits(plan): { maxShops, maxDailyCustomers, features[] }`

### Task 2: Feature gates middleware

**Objective:** Restrict features based on plan

**Files:**
- Create: `src/lib/plans.ts` — plan definitions & limits
- Modify: `src/app/api/shops/[id]/queue/route.ts` — check max daily customers
- Modify: `src/app/dashboard/page.tsx` — limit number of shops per plan
- Modify: `src/app/dashboard/shop/[id]/page.tsx` — show plan badge

### Task 3: Plans & Pricing page

**Objective:** Show available plans on the dashboard

**Files:**
- Create: `src/app/dashboard/pricing/page.tsx` — pricing plans
- Modify: `src/app/dashboard/page.tsx` — link to pricing

### Task 4: Subscription management page

**Objective:** Allow users to see & manage their subscription

**Files:**
- Create: `src/app/dashboard/settings/page.tsx` — subscription settings
- Modify: `src/lib/db.ts` — subscription management functions

### Task 5: Manual payment activation (Vodafone Cash)

**Objective:** Process payments manually via Vodafone Cash

**Files:**
- Create: `src/app/api/admin/activate-plan/route.ts` — admin endpoint
- Show Vodafone Cash number on pricing page
- Admin activates after payment confirmed

---

## Phase 2: WhatsApp Integration (KILLER FEATURE)

### Task 6: WhatsApp notification system

**Objective:** Send WhatsApp message to customer when their turn arrives

**Files:**
- Create: `src/lib/whatsapp.ts` — WhatsApp API client
- Modify: `src/lib/db.ts` — add notification tracking
- Modify: `src/app/api/shops/[id]/queue/route.ts` — trigger WhatsApp on call

### Task 7: WhatsApp settings for shops

**Objective:** Shops configure their WhatsApp for notifications

**Files:**
- Modify: `src/app/dashboard/shop/[id]/page.tsx` — WhatsApp toggle
- Create: `src/app/api/shops/[id]/whatsapp/route.ts` — WhatsApp settings API

---

## Phase 3: Growth Features

### Task 8: PWA (Progressive Web App)

**Files:**
- Modify: `src/app/layout.tsx` — add manifest link
- Create: `public/manifest.json`
- Add service worker registration

### Task 9: Advanced reports & PDF export

**Files:**
- Create: `src/lib/reports.ts` — report generation
- Modify: `src/app/dashboard/shop/[id]/stats/page.tsx` — enhanced reports
- Add PDF export button

### Task 10: Stripe automated payments

**Files:**
- Create: `src/app/api/stripe/webhook/route.ts` — Stripe webhook
- Modify: `src/app/dashboard/settings/page.tsx` — Stripe checkout
- Add `@stripe/stripe-js` dependency

---

## Order of Execution

```
Phase 1 (Tasks 1-5) → SHIP THIS WEEK → Start getting paid
  ↓
Phase 2 (Tasks 6-7) → NEXT WEEK → Killer feature that converts free→paid
  ↓
Phase 3 (Tasks 8-10) → WEEK 3-4 → Polish & scale
```

