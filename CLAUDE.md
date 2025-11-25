# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Band Assist (Sharp Dressed Band) is a browser-based React SPA for band management. It helps bands manage songs, charts, setlists, practice schedules, and member assignments. The app runs entirely client-side with localStorage persistence and integrates Google Gemini AI for music analysis.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, AlphaTab (Guitar Pro rendering), Google Gemini AI

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Before running the app, set `GEMINI_API_KEY` in `.env.local`:

```env
GEMINI_API_KEY=your_api_key_here
```

The Vite config maps this to `process.env.API_KEY` and `process.env.GEMINI_API_KEY` for compatibility.

## Architecture Overview

### Core State Management Pattern

All application state lives in `App.tsx` and flows down via props. There is NO external state management library (no Redux, Zustand, etc.). State updates flow back up through callback props like `onUpdateSong`.

**Key State:**

- `songs: Song[]` - All songs in the repertoire
- `members: BandMember[]` - Band roster
- `availableRoles: string[]` - Instrument/role options
- `events: BandEvent[]` - Schedule (practices, gigs)

**State Initialization:** Uses lazy initialization with `StorageService.load()` to restore from localStorage, falling back to `INITIAL_SONGS` and default data if empty.

**Auto-Save:** A `useEffect` in `App.tsx` automatically saves all state to localStorage whenever core data changes.

**Context API:** State is shared via `AppContext` (created in `App.tsx`) and accessed through the `useAppContext()` hook. The context value is memoized with `useMemo` for performance.

### Routing System (React Router)

Navigation uses React Router v6 with URL-based routing. The `Navigation` component uses `useNavigate()` internally for route changes.

**Route Structure:**

- `/` - Dashboard (main song overview)
- `/songs/:songId` - Song detail editor (full-screen, no sidebar)
- `/songs/:songId/practice` - Practice room for specific song
- `/setlist` - Setlist builder
- `/practice` - Practice room (song selection)
- `/schedule` - Event management
- `/band` - Per-member assignment view
- `/settings` - Band roster, roles, data import/export
- `/performance` - Live performance view (full-screen, minimal UI)

**Layout Routes:** Routes with sidebar use `AppLayout` as a layout route with `<Outlet />`. Full-screen routes (song detail, performance) render without the sidebar.

**Route Components:** `SongDetailRoute` and `PracticeRoomRoute` are wrapper components that extract URL params and connect to context.

### Data Models (types.ts)

**`Song`** - Central entity containing:

- Basic metadata (title, artist, bpm, key, duration, status)
- `charts: SongChart[]` - Multi-chart system (TEXT, IMAGE, PDF, GP)
- `assignments: Assignment[]` - Links members to roles for this song
- `parts: SongPart[]` - Song sections (Intro, Verse, Solo, etc.)
- `backingTrackUrl?: string` - Base64 data URI for audio
- Legacy fields (tabContent, tabUrl, lyrics) - kept for migration but use `charts` instead

**`SongChart`** - Flexible chart storage:

- `type: 'TEXT' | 'IMAGE' | 'PDF' | 'GP'`
- TEXT: Uses `content` field for raw text/tablature
- IMAGE/PDF/GP: Uses `url` field for Base64 data URIs
- `annotations: Annotation[]` - Line-based notes for TEXT charts

**`Assignment`** - Links a `memberId` to a `role` for a specific song

**`BandMember`** - Person in the band with `roles: string[]` (preferred instruments)

**`BandEvent`** - Scheduled event (PRACTICE | GIG | OTHER)

### Data Persistence (services/storageService.ts)

**StorageService API:**

- `save(songs, members, roles, events)` - Saves to localStorage with keys `sdb_*`
- `load()` - Loads from localStorage, includes legacy data migration
- `exportData()` - Downloads JSON backup file
- `importData(file)` - Restores from JSON backup

**Migration:** The `load()` function automatically migrates legacy `tabContent`/`tabUrl` to the new `charts[]` array format.

**Storage Keys:** All use `sdb_` prefix (songs, members, roles, events)

### AI Integration (services/geminiService.ts)

**Gemini Service Functions:**

- `getMusicAnalysis(prompt, context?, mediaData?)` - General-purpose music analysis/coaching
- `extractPracticePlan(songTitle, difficulty)` - Generates 3-step practice routine
- `extractSongParts(instruction, mediaData)` - Parses charts into structured JSON

**Model:** Uses `gemini-2.5-flash`

**Multimodal Support:** Can send Base64-encoded images/PDFs alongside text prompts for chart analysis.

**API Key:** Retrieved from `process.env.API_KEY` (injected by Vite from `GEMINI_API_KEY` env var). If missing, functions return graceful error messages.

## Key Components

### SongDetail (components/SongDetail.tsx)

The main song editing interface. Handles:

- Metadata editing (title, artist, key, bpm, status)
- Multi-chart system (create TEXT charts, upload PDF/images/GP files)
- Member assignments per song
- AI Studio Assistant chat interface
- Backing track upload

**Important:** When uploading files, they are converted to Base64 data URIs and stored inline in the `Song` object. Files >10MB are rejected.

**Chart Upload Types:**

- `.pdf` → type: 'PDF'
- Images (`.png`, `.jpg`) → type: 'IMAGE'
- Guitar Pro (`.gp`, `.gpx`, `.gp3-7`) → type: 'GP'
- Manual text entry → type: 'TEXT'

### SmartTabEditor (components/SmartTabEditor.tsx)

Intelligent text chart viewer/editor. Used in SongDetail, PracticeRoom, and PerformanceMode.

**Features:**

- **Line Analysis:** Auto-detects CHORD, LYRIC, HEADER, TAB, or EMPTY lines using regex heuristics
- **Chord Transposition:** Can shift all chords up/down by semitones
- **Annotations:** Add colored notes to specific lines

**Transpose Logic:** Uses two note arrays (`NOTES` with sharps, `NOTES_FLAT` for detection) to handle enharmonic equivalents. Output prefers sharps.

### AlphaTabRenderer (components/AlphaTabRenderer.tsx)

React wrapper around the AlphaTab library for rendering Guitar Pro files (`.gp*`).

**Usage:** Pass Base64-encoded GP file data via the `fileData` prop. The component converts it to binary and renders interactive sheet music/tablature.

**Important:** AlphaTab is loaded globally from CDN in `index.html`. Ensure the global `alphaTab` object is available.

## Important Patterns

### File Uploads

All uploaded files (PDFs, images, audio, GP files) are converted to Base64 data URIs and stored inline in the state. This eliminates the need for a backend but can cause localStorage quota issues with large files. The StorageService shows an alert if quota is exceeded.

### Data URI Format

Files stored as: `data:{mimeType};base64,{base64String}`

When passing to Gemini AI or other services, extract with:

```typescript
const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
const mimeType = matches[1];
const base64Data = matches[2];
```

### URL Navigation

Use React Router's `useNavigate()` hook for navigation. Common patterns:

```typescript
const navigate = useNavigate();

// Navigate to song detail
navigate(`/songs/${songId}`);

// Navigate back to dashboard (prefer explicit paths over navigate(-1))
navigate('/');

// Navigate with replace (for redirects)
navigate('/', { replace: true });
```

For components that receive navigation callbacks as props (e.g., `onNavigateToSong`, `onBack`), these should use explicit paths rather than `navigate(-1)` to ensure reliable behavior when users directly access URLs.

### State Updates

Always use the callback functions passed down from `App.tsx`:

- `onUpdateSong(updatedSong)` - For modifying songs
- `setMembers(newMembers)` - For updating band roster
- `setSongs(newSongs)` - For bulk song operations
- `setEvents(newEvents)` - For schedule changes

Never mutate state objects directly. Always create new objects/arrays:

```typescript
// Good
onUpdateSong({ ...song, title: 'New Title' });
setSongs(songs.map(s => (s.id === song.id ? updatedSong : s)));

// Bad
song.title = 'New Title'; // Direct mutation
```

## Testing Notes

This project does not currently have a test suite. When adding tests:

- Test state update logic in App.tsx
- Test StorageService save/load and migration
- Test SmartTabEditor line analysis and transposition
- Mock localStorage and geminiService API calls

## Deployment

The app is static and can be deployed to any static host (Vercel, Netlify, GitHub Pages, etc.). Ensure the `GEMINI_API_KEY` environment variable is set in your deployment platform.

**Build output:** `npm run build` creates production files in `dist/`

## Common Pitfalls

1. **AlphaTab Global Dependency:** The `AlphaTabRenderer` component expects `window.alphaTab` to be available. Ensure the CDN script in `index.html` loads before React components render.

2. **localStorage Quota:** Large files (audio, PDFs) can fill localStorage quickly. Users should export backups regularly and avoid storing very large files.

3. **Legacy Data:** When working with older songs, check for both `charts[]` (new) and `tabContent`/`tabUrl` (legacy). The migration in `storageService.ts` handles this on load, but manual updates should target `charts`.

4. **Gemini API Errors:** If `process.env.API_KEY` is undefined, AI features silently fail with error messages. Always check the env setup.

5. **TypeScript Strictness:** The project uses `"strict": true`. Ensure all props are properly typed and avoid `any` unless absolutely necessary.

6. **Direct URL Access:** Users can navigate directly to URLs like `/songs/123`. Handle missing resources gracefully with toast notifications and redirects. The `SongDetailRoute` component shows a toast and redirects to `/` if a song is not found.

7. **Navigation History:** Avoid using `navigate(-1)` for back navigation as it relies on browser history that may not exist for direct URL access. Use explicit paths like `navigate('/')` instead.
