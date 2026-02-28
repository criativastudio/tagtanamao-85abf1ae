

## Plan: Separate Landing Page Visibility for Templates

### Problem
Currently, `is_active` controls both landing page and internal visibility. The user wants to hide templates from the landing page without affecting the internal shop or public user pages.

### Changes

#### 1. Database Migration
- Add `show_on_landing` boolean column to `display_templates` table, default `true`

#### 2. Filter Landing Page Query (`src/components/Products.tsx`)
- Add `.eq("show_on_landing", true)` to the `display_templates` query (line 33) so templates with `show_on_landing = false` are hidden from the landing page only

#### 3. Internal Shop Unchanged (`src/pages/customer/Shop.tsx`)
- No changes needed — it only filters by `is_active`, so templates remain visible internally regardless of `show_on_landing`

#### 4. Admin Toggle (`src/pages/admin/DisplayTemplatesManager.tsx`)
- Add a `show_on_landing` toggle (Switch) on each template card, next to the existing `is_active` switch
- Label it "Landing Page" for quick identification
- One-click toggle that updates the `show_on_landing` column directly

### Files Modified
- `display_templates` table (migration)
- `src/components/Products.tsx` — filter by `show_on_landing`
- `src/pages/admin/DisplayTemplatesManager.tsx` — add toggle switch

