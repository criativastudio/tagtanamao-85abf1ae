

## Plan: Add Custom Slug for Business Displays

The `business_displays` table already has a `slug` column. The plan is to:

1. **Add a new route** `/d/:slug` in `App.tsx` that resolves a display by its slug (acting as a friendly alias over the existing `/display/:qrCode` URL)

2. **Update `PublicDisplayPage.tsx`** to also try matching by `slug` when the `qr_code` lookup fails, so both `/display/:qrCode` and `/d/:slug` work

3. **Add slug editor field in `DisplaysManager.tsx`** (the business display editor) — an input field with validation (alphanumeric, dots, hyphens, underscores), real-time availability check, and save alongside other display data

4. **Add slug editor field in `DisplayTemplateManager.tsx`** (the template manager page) — similar slug input with the shareable link displayed

5. **Show the friendly URL** (`/d/slug`) next to the QR code info so users can copy/share it

### Technical Details

- **Route**: New route `<Route path="/d/:slug" element={<PublicDisplayPage />} />` using the same component
- **Resolution logic**: In `PublicDisplayPage`, detect if param could be a slug (non-UUID format) and query by `slug` column; if UUID-like, query by `qr_code` as before
- **Slug validation**: Same pattern as bio pages — `/^[a-zA-Z0-9._-]+$/`, min 3 chars, max 30 chars
- **Availability check**: Query `business_displays` where `slug = input` and `id != current display id`
- **Save**: Include `slug` in the existing `handleSave` update payload in `DisplaysManager.tsx`
- **Files modified**: `src/App.tsx`, `src/pages/PublicDisplayPage.tsx`, `src/pages/DisplaysManager.tsx`, `src/pages/customer/DisplayTemplateManager.tsx`

