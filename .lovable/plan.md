

## Plan: Separate Landing Visibility from Template Activation

### Root Cause
The RLS policy `Anyone can view active templates` uses `is_active = true`. When a template is deactivated (`is_active = false`), non-admin users can't see it **anywhere** — not just the landing page. The `show_on_landing` column already exists but the `is_active` toggle still controls global visibility via RLS.

### Changes

#### 1. Update RLS Policy (migration)
Change the SELECT policy on `display_templates` to allow all authenticated users to see all templates, while keeping the `is_active` filter only for anonymous/public access:

```sql
DROP POLICY "Anyone can view active templates" ON display_templates;
CREATE POLICY "Anyone can view active templates" ON display_templates
  FOR SELECT USING (true);
```

This makes all templates visible to everyone at the database level. Filtering for landing/shop is handled in application code.

#### 2. Landing Page (`src/components/Products.tsx`)
Already filters by `.eq("show_on_landing", true)` — no change needed.

#### 3. Internal Shop (`src/pages/customer/Shop.tsx`)
Already filters by `.eq("is_active", true)` — keeps working as intended. Templates hidden from landing but with `is_active = true` remain visible here.

#### 4. Other internal pages
- `DisplayTemplateSelector.tsx`, `DisplayTemplateManager.tsx`, `DashboardTemplates.tsx` — all filter by `.eq("is_active", true)` in code, no changes needed.

#### 5. Admin UI — Replace `is_active` toggle label
In both `DisplayTemplatesManager.tsx` and `TemplatesTabContent.tsx`:
- Rename the `is_active` toggle label to "Ativo" for clarity
- The `show_on_landing` toggle (already labeled "Landing") controls landing visibility independently
- No functional code change needed — the toggles already work correctly

### Summary
The only real fix is the RLS policy. Currently it blocks non-admin users from seeing `is_active = false` templates. By opening SELECT to all rows, the app-level filters (`is_active` for shop, `show_on_landing` for landing) handle visibility correctly.

### Files Modified
- `display_templates` RLS policy (migration)

