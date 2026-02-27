

## Plan: Netflix Template Image Slider + Drag-to-Reorder Thumbnails

### Current State
- Thumbnails render as a static 3-column grid in `NetflixTemplate.tsx` (line 424)
- Covers use a CSS auto-scroll carousel
- No drag-and-drop reordering exists in the editor

### Changes

#### 1. Convert Thumbnail Sections to Swipeable Slider (`NetflixTemplate.tsx`)
- Replace the `grid grid-cols-3` layout with a horizontally scrollable container using touch events + CSS `overflow-x: scroll` with snap points
- Add left/right arrow buttons (chevrons) for click navigation
- Support swipe/drag on mobile via native scroll behavior with `scroll-snap-type: x mandatory`
- Each thumbnail becomes a `scroll-snap-align: start` item
- Hide scrollbar with CSS (`scrollbar-width: none`, `-webkit-scrollbar`)

#### 2. Add Drag-to-Reorder in Editor (`TemplateMediaEditor.tsx`)
- Add drag-and-drop reordering to the `renderMediaGrid` function for covers and thumbnails
- Use HTML5 native drag events (`onDragStart`, `onDragOver`, `onDrop`) — no external library needed
- Show a visual drag handle icon on each media item
- When items are dropped, update the array order in config and call `onChange`

#### 3. Files Modified
- `src/components/display/NetflixTemplate.tsx` — swipeable slider with arrows for thumbnail sections
- `src/components/display/TemplateMediaEditor.tsx` — drag-to-reorder media items

