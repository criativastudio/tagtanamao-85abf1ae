

## Plan: Add Netflix "Ta-Dum" Sound on Template Load

### Approach
Use a free Netflix-style sound effect hosted in the `public/` folder, played automatically when the `NetflixTemplate` component mounts on the public page. Due to browser autoplay policies, we'll play the sound on the first user interaction (click/touch/scroll) as a fallback if autoplay is blocked.

### Steps

1. **Add sound file** — Place a Netflix "ta-dum" `.mp3` file in `public/sounds/netflix-tadum.mp3` (short ~3s clip)

2. **Update `NetflixTemplate.tsx`**:
   - Add a `useEffect` that creates an `Audio` object and attempts to play it on mount
   - If autoplay is blocked (browsers often block it), register a one-time event listener on `click`/`touchstart` to play the sound on first interaction
   - Only play when `isPublic` prop is true (to avoid playing in editor previews)

3. **Add `isPublic` prop** to `NetflixTemplateProps` (default `false`) to distinguish public page vs editor preview

4. **Update `PublicDisplayPage.tsx`** — Pass `isPublic={true}` to `NetflixTemplate`

5. **Keep editor previews silent** — `DisplayTemplateManager.tsx` won't pass `isPublic`, so sound won't play during editing

### Files
- `public/sounds/netflix-tadum.mp3` (new — generated/sourced audio file)
- `src/components/display/NetflixTemplate.tsx` (add sound logic + `isPublic` prop)
- `src/pages/PublicDisplayPage.tsx` (pass `isPublic={true}`)

