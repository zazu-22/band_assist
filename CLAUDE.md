# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Band Assist (Sharp Dressed Band) is a React SPA for band management. It helps bands manage songs, charts, setlists, practice schedules, and member assignments. The app uses Supabase for data persistence and authentication.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, AlphaTab (Guitar Pro rendering), Google Gemini AI

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

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Environment Setup

Create `.env.local` with the following variables:

```env
# Required for AI features
GEMINI_API_KEY=your_api_key_here

# Required - Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Vite config maps `GEMINI_API_KEY` to `process.env.API_KEY` and `process.env.GEMINI_API_KEY` for compatibility.

**Note:** Supabase configuration is required. The app will throw an error on startup if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set.

## Architecture Overview

### Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (Toast, ConfirmDialog, etc.)
│   ├── Dashboard.tsx    # Main song overview
│   ├── SongDetail.tsx   # Full song editor
│   ├── SmartTabEditor.tsx # Text chart viewer/editor
│   ├── AlphaTabRenderer.tsx # Guitar Pro renderer
│   ├── PracticeRoom.tsx # Practice interface
│   ├── PerformanceMode.tsx # Live performance view
│   ├── SetlistManager.tsx # Setlist builder
│   ├── ScheduleManager.tsx # Event scheduling
│   ├── BandDashboard.tsx # Per-member view
│   ├── Settings.tsx     # Band configuration
│   ├── Navigation.tsx   # Sidebar navigation
│   ├── BandSelector.tsx # Multi-band switcher
│   ├── Login.tsx        # Authentication
│   ├── Signup.tsx       # Registration
│   ├── PasswordReset.tsx # Password reset request
│   ├── PasswordUpdate.tsx # Password reset completion
│   ├── AuthLayout.tsx   # Auth page template
│   └── InvitationManager.tsx # Team invitations
├── services/            # Business logic & data persistence
│   ├── storageService.ts # Main storage facade
│   ├── supabaseStorageService.ts # Supabase backend
│   ├── localStorageService.ts # Browser localStorage
│   ├── supabaseClient.ts # Supabase configuration
│   ├── geminiService.ts # Google Gemini AI
│   ├── migrationService.ts # Local to Supabase migration
│   └── IStorageService.ts # Storage interface
├── types/
│   └── database.types.ts # Supabase schema types
├── types.ts             # Core data types
├── hooks/
│   └── useConfirmDialog.ts # Reusable confirm dialog hook
├── utils/
│   └── validation.ts    # Email & password validation
├── App.tsx              # Main app, routing, state management
├── constants.ts         # Initial data & defaults
└── index.css            # Tailwind imports
```

### Core State Management Pattern

All application state lives in `App.tsx` and flows down via React Context. There is NO external state management library.

**Key State:**
- `songs: Song[]` - All songs in the repertoire
- `members: BandMember[]` - Band roster
- `availableRoles: string[]` - Instrument/role options
- `events: BandEvent[]` - Schedule (practices, gigs)
- `session: Session | null` - Supabase auth session
- `currentBandId: string | null` - Active band for multi-band support

**AppContext Interface:**
```typescript
interface AppContextValue {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  members: BandMember[];
  setMembers: React.Dispatch<React.SetStateAction<BandMember[]>>;
  availableRoles: string[];
  setAvailableRoles: React.Dispatch<React.SetStateAction<string[]>>;
  events: BandEvent[];
  setEvents: React.Dispatch<React.SetStateAction<BandEvent[]>>;
  handleUpdateSong: (song: Song) => void;
  session: Session | null;
  currentBandId: string | null;
  isAdmin: boolean;
}
```

Access context with the `useAppContext()` hook. The context value is memoized with `useMemo` for performance.

**Auto-Save:** A `useEffect` in `App.tsx` automatically saves all state via `StorageService.save()` whenever core data changes.

### Routing System (React Router v6)

**Authentication Routes (Supabase mode only):**
- `/login` - User login
- `/signup` - Registration
- `/password-reset` - Request password reset
- `/password-update` - Complete password reset (from email link)

**Full-Screen Routes (no sidebar):**
- `/songs/:songId` - Song detail editor
- `/songs/:songId/practice` - Practice room with specific song
- `/performance` - Live performance view

**Layout Routes (with sidebar):**
- `/` - Dashboard (index route)
- `/setlist` - Setlist builder
- `/practice` - Practice room (song selection)
- `/schedule` - Event management
- `/band` - Per-member assignment view
- `/settings` - Band roster, roles, team, data

**Route Components:** `SongDetailRoute` and `PracticeRoomRoute` extract URL params and connect to context.

### Data Models (types.ts)

**`Song`** - Central entity:
- Basic metadata: `title`, `artist`, `bpm`, `key`, `duration`, `status`
- Status: `'To Learn' | 'In Progress' | 'Performance Ready'`
- `charts: SongChart[]` - Multi-chart system (TEXT, IMAGE, PDF, GP)
- `assignments: Assignment[]` - Links members to roles
- `parts: SongPart[]` - Song sections (Intro, Verse, Solo, etc.)
- `backingTrackUrl?: string` - Base64 data URI for audio
- `backingTrackStoragePath?: string` - Supabase Storage path
- Legacy fields (`tabContent`, `tabUrl`, `lyrics`) - kept for migration

**`SongChart`** - Flexible chart storage:
- `type: 'TEXT' | 'IMAGE' | 'PDF' | 'GP'`
- TEXT: Uses `content` field
- IMAGE/PDF/GP: Uses `url` (Base64) or `storagePath` (Supabase)
- `annotations: Annotation[]` - Line-based notes

**`Assignment`** - Links `memberId` to `role` for a song

**`BandMember`** - Person with `roles: string[]` (preferred instruments)

**`BandEvent`** - Scheduled event (`PRACTICE | GIG | OTHER`)

### Data Persistence

**Storage Service Architecture:** Uses `IStorageService` interface implemented by Supabase backend.

**`storageService.ts`** - Main facade wrapping `supabaseStorageService.ts`. Throws error if Supabase is not configured.

**Note:** `localStorageService.ts` exists for data export/import and migration purposes but is not used as a runtime storage backend.

**API:**
- `save(songs, members, roles, events)` - Persist all state to Supabase
- `load()` - Load state from Supabase (includes legacy migration)
- `exportData()` - Download JSON backup
- `importData(file)` - Restore from JSON
- `setCurrentBand(bandId)` - Set band context for multi-band queries

**Band Context Lifecycle:** `setCurrentBand()` is called in `App.tsx` after authentication succeeds and before loading band data. It must be set before any data operations to scope queries to the correct band.

**Migration:** Auto-migrates legacy `tabContent`/`tabUrl` to `charts[]` array on load.

### AI Integration (services/geminiService.ts)

**Model:** `gemini-2.5-flash`

**Functions:**
- `getMusicAnalysis(prompt, context?, mediaData?)` - General music analysis/coaching
- `extractPracticePlan(songTitle, difficulty)` - 3-step practice routine
- `extractSongParts(instruction, mediaData)` - Parse charts into structured JSON

**Multimodal Support:** Accepts Base64-encoded images/PDFs alongside text prompts.

**Error Handling:** If `process.env.API_KEY` is undefined, functions return graceful error messages.

## Key Components

### SongDetail (components/SongDetail.tsx)

Main song editing interface:
- Metadata editing (title, artist, key, bpm, status)
- Multi-chart management (TEXT, PDF, images, Guitar Pro)
- Member assignments per song
- AI Studio Assistant chat
- Backing track upload & playback
- Annotations system

**File Upload:** Converts to Base64 data URIs. Files >10MB are rejected.

### SmartTabEditor (components/SmartTabEditor.tsx)

Intelligent text chart viewer/editor:
- **Line Analysis:** Auto-detects CHORD, LYRIC, HEADER, TAB, EMPTY via regex
- **Chord Transposition:** Shift all chords up/down by semitones
- **Annotations:** Add colored notes to specific lines
- **Two modes:** VIEW and EDIT

### AlphaTabRenderer (components/AlphaTabRenderer.tsx)

Guitar Pro file renderer wrapping AlphaTab library:
- Interactive sheet music/tablature
- Playback controls with metronome
- Track muting/soloing
- Position tracking with throttled updates

**Note:** AlphaTab is loaded from CDN (`@coderline/alphatab@latest`) in `index.html`. The `@coderline/alphatab` npm package is also installed for type definitions.

### Settings (components/Settings.tsx)

Band configuration with tabs:
- **ROSTER** - Add/edit/delete band members
- **ROLES** - Configure available instruments
- **TEAM** - Invitation management (Supabase only)
- **DATA** - Import/export JSON backups

### UI Components (components/ui/)

- `Toast.tsx` - Toast notifications (Sonner wrapper)
- `ConfirmDialog.tsx` - Confirmation modals (danger/warning/info variants)
- `EmptyState.tsx` - Empty state displays
- `LoadingSpinner.tsx` - Loading indicator
- `ErrorBoundary.tsx` - Error capture & display

## Important Patterns

### File Uploads & Data URIs

Files are converted to Base64 data URIs and stored inline (or in Supabase Storage).

**Format:** `data:{mimeType};base64,{base64String}`

**Extraction:**
```typescript
const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
const mimeType = matches[1];
const base64Data = matches[2];
```

### State Updates

Always use immutable updates:
```typescript
// Good
handleUpdateSong({ ...song, title: 'New Title' });
setSongs(songs.map(s => s.id === id ? updated : s));

// Bad - never mutate directly
song.title = 'New Title';
```

### URL Navigation

Use React Router's `useNavigate()` with explicit paths:
```typescript
const navigate = useNavigate();
navigate(`/songs/${songId}`);
navigate('/'); // Prefer over navigate(-1)
navigate('/', { replace: true }); // For redirects
```

### Authentication Flow (Supabase Mode)

1. App checks session on mount via Supabase auth listener
2. If session exists, fetch/create user's band
3. If no band, create default "My Band" with user as admin
4. Set band context in StorageService
5. Load band data

### Multi-Band Support

- Users can belong to multiple bands
- `BandSelector` component for switching
- `currentBandId` tracks active band
- Band change triggers full data reload

## Testing

Testing is configured with Vitest and React Testing Library.

```bash
npm test
```

**Test targets:**
- State update logic in App.tsx
- StorageService save/load and migration
- SmartTabEditor line analysis and transposition
- Validation utilities

## Deployment

The app is static and can be deployed to any static host (Vercel, Netlify, GitHub Pages, etc.).

**Required environment variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - For AI features (optional, AI features disabled without it)

**Build output:** `npm run build` creates production files in `dist/`

## Common Pitfalls

1. **AlphaTab Global:** `AlphaTabRenderer` expects `window.alphaTab` from CDN. Ensure the script loads before React renders.

2. **Supabase Required:** The app requires Supabase configuration. Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app will fail to start.

3. **Legacy Data Migration:** The storage service auto-migrates legacy `tabContent`/`tabUrl` to `charts[]`. Manual updates should target `charts`.

4. **Gemini API Key:** If missing, AI features fail silently with error messages. Always verify env setup.

5. **TypeScript Strictness:** Project uses `"strict": true`. Properly type all props; avoid `any`.

6. **Direct URL Access:** Handle missing resources gracefully. `SongDetailRoute` shows toast and redirects to `/` if song not found.

7. **Navigation History:** Avoid `navigate(-1)`. Use explicit paths for reliable behavior with direct URL access.

8. **Supabase Configuration:** If `VITE_SUPABASE_URL` is set but invalid, authentication will fail. Verify Supabase project setup.

9. **Band Context:** In Supabase mode, always ensure `setCurrentBand()` is called before data operations to scope queries correctly.
