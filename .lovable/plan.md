

## Plan: Add Special Buttons (Wi-Fi, PIX, Salvar Contato, Agendamento) to Netflix Template

### Context
The bio page (standard template) already has configurable special buttons (Wi-Fi, Salvar Contato, PIX, Agendamento) stored in `business_displays.buttons` as JSONB. The Netflix template currently ignores these buttons entirely — both in the editor and the public page.

### Changes Required

#### 1. `src/components/display/NetflixTemplate.tsx`
- Add `buttons` prop (array of button objects with `id`, `label`, `url`, `icon`, `enabled`)
- Add `onButtonClick` callback prop for handling special button actions
- Render enabled buttons in a styled section above the footer (or below thumbnails), matching the Netflix dark theme with red accents
- Use the existing `LucideIcon` renderer for button icons

#### 2. `src/pages/PublicDisplayPage.tsx`
- When rendering `NetflixTemplate` (line ~338), pass `display.buttons` and a click handler
- Add the same special button handling logic that already exists for the bio page: Wi-Fi opens `WifiModal`, PIX opens `PixModal`, Contact triggers vCard download, Calendar/Star open URLs
- Reuse existing `wifiModal`/`pixModal` state and the `WifiModal`/`PixModal` components already imported

#### 3. `src/components/display/TemplateMediaEditor.tsx`
- Add a new tab "Ações" (or extend "Botões" tab) with a dedicated section for special buttons
- Allow toggling Wi-Fi, Salvar Contato, PIX, and Agendamento on/off
- When enabled, show the relevant fields from `SpecialButtonFields` (Wi-Fi: SSID/password/encryption; PIX: key/amount/description; Contact: vCard fields; Agendamento: URL)
- Store these as part of `template_config.specialButtons` array in the same format as bio page buttons

#### 4. `src/pages/customer/DisplayTemplateManager.tsx`
- Pass the buttons data through to the preview and save flow — the `template_config` already persists to `business_displays.template_config`

### Data Flow
- **Editor**: User configures special buttons in `TemplateMediaEditor` → stored in `template_config.specialButtons`
- **Save**: `template_config` is saved to `business_displays.template_config` (existing JSONB column)
- **Public page**: `PublicDisplayPage` reads `template_config.specialButtons` and passes to `NetflixTemplate` + handles click actions with modals
- No database schema changes needed — uses existing `template_config` JSONB field

### Button Rendering in Netflix Theme
Buttons will appear as a horizontal row of rounded dark cards with icon + label, styled with the Netflix dark aesthetic (dark cards, white text, red accent on hover), placed between the thumbnail sections and the footer.

