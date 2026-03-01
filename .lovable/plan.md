

## Test Results & Findings

### Current State
The Netflix Premium template has `is_active = false` and `show_on_landing = true`. The RLS policy fix was applied (SELECT USING true), which is correct.

### Problem Found
The `show_on_landing` toggle works for the **landing page** (Products.tsx filters by it), but the **`is_active` toggle is still being used as the main visibility control everywhere**:
- **Landing page** (`Products.tsx`): filters by `is_active = true` AND `show_on_landing = true` — correct
- **Internal shop** (`Shop.tsx`): filters by `.eq("is_active", true)` — template hidden when `is_active = false`
- **Dashboard templates** (`DashboardTemplates.tsx`): filters by `.eq("is_active", true)` — template hidden
- **Display template manager** (`DisplayTemplateManager.tsx`): filters by `.eq("is_active", true)` — template hidden

The user's intent is: `show_on_landing = false` hides from landing, but `is_active` should NOT affect internal views for logged-in users. Internal pages should show all templates regardless of `is_active`.

### Fix Required

#### 1. Internal Shop (`src/pages/customer/Shop.tsx`)
Remove `.eq("is_active", true)` from the `display_templates` query so all templates appear in the internal shop.

#### 2. Dashboard Templates (`src/components/dashboard/DashboardTemplates.tsx`)
Remove `.eq("is_active", true)` from the `display_templates` query.

#### 3. Display Template Manager (`src/pages/customer/DisplayTemplateManager.tsx`)
Remove `.eq("is_active", true)` from the `display_templates` query.

#### 4. Landing Page (`src/components/Products.tsx`)
Already filters by both `is_active = true` and `show_on_landing = true` — keep as-is. Only active templates shown on landing appear publicly.

#### 5. Set Netflix template back to active
Run a database update: `UPDATE display_templates SET is_active = true, show_on_landing = false WHERE name = 'Netflix Premium'` — makes the template available internally but hidden from landing.

### Summary
- **Landing page**: shows only `is_active = true` AND `show_on_landing = true`
- **Internal pages (shop, dashboard, template manager)**: shows ALL templates (no `is_active` filter) so users always see what they purchased
- Admin controls `show_on_landing` to toggle landing visibility independently

