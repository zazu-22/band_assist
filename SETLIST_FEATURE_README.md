# Setlist Builder Design System Extension

This document describes the implementation plan for extending the "Backstage Command Center" design system to the Setlist Builder component.

## Overview

The Setlist Builder (`src/components/SetlistManager.tsx`) is being refactored to align with the design system patterns established in the Dashboard and Practice Room components.

### Goals

- Apply design system typography (Brawler serif, JetBrains Mono, Barlow)
- Add readiness metrics with segmented progress bar
- Implement Card patterns from shadcn/ui
- Add staggered entrance animations
- Improve drag-and-drop UX
- Connect to performance context (gig countdown)
- Maintain full backward compatibility

## Quick Start

```bash
# Setup and run development server
./init.sh

# Or manually:
npm install
npm run dev
```

Access the app at http://localhost:3000/setlist

## Project Structure

```
src/components/
├── SetlistManager.tsx          # Main component (to be refactored)
├── setlist/                    # NEW: Sub-components directory
│   ├── index.ts               # Barrel export
│   ├── SetlistHeader.tsx      # Header with title and gig context
│   ├── SetlistStats.tsx       # Readiness metrics card
│   ├── SetlistItem.tsx        # Individual song item
│   ├── SetlistItem.test.tsx   # Unit tests
│   ├── SetlistActionBar.tsx   # Add song + AI buttons
│   └── AddSongForm.tsx        # Add song card form
```

## Implementation Phases

### Phase 1: Component Extraction

- Create `src/components/setlist/` directory
- Extract SetlistItem as standalone component
- Apply design system patterns to SetlistItem
- Add unit tests

### Phase 2: Header and Stats

- Create SetlistHeader with gig countdown
- Create SetlistStats with progress bar
- Integrate into SetlistManager

### Phase 3: Action Bar and Form

- Create SetlistActionBar component
- Create AddSongForm with Card pattern
- Update SetlistManager

### Phase 4: Integration and Polish

- Add ambient background glow
- Ensure staggered animations
- Wire up `events` prop in App.tsx
- Final styling

### Phase 5: Testing and Documentation

- Complete unit tests
- Update CLAUDE.md
- Update design-system.md

## Testing

```bash
# Run all tests
npm test

# Run tests for setlist components only
npm test -- --grep "Setlist"

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Feature Tracking

All features are tracked in `feature_list.json`. Each feature starts with `"passes": false` and is marked `true` only after verification.

**Important:** Never remove or modify feature descriptions. Only change `passes` from `false` to `true`.

## Design System Reference

See `docs/design-system.md` for:

- Typography guidelines
- Status colors
- Animation patterns
- Component patterns
- Layout principles

## Key Files

| File                                | Purpose                          |
| ----------------------------------- | -------------------------------- |
| `feature_list.json`                 | Feature tracking (50 test cases) |
| `init.sh`                           | Development setup script         |
| `src/components/SetlistManager.tsx` | Current implementation           |
| `docs/design-system.md`             | Design system reference          |
| `src/index.css`                     | Theme variables and animations   |

## Development Notes

### Design System Classes

```tsx
// Typography
font-serif          // Brawler - headlines
font-mono           // JetBrains Mono - numbers
tabular-nums        // Fixed-width numbers

// Status colors
bg-success          // Green - Performance Ready
bg-info             // Blue - In Progress
bg-warning          // Amber - To Learn

// Animations
animate-slide-in-from-bottom
animate-slide-in-from-top
animate-progress-fill
animate-pulse-glow
stagger-1 through stagger-5
animation-forwards
```

### Required Props Changes

```tsx
// Old interface
interface SetlistManagerProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  onSelectSong: (songId: string) => void;
}

// New interface (add events)
interface SetlistManagerProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  onSelectSong: (songId: string) => void;
  events?: BandEvent[]; // NEW: for gig countdown context
}
```

### App.tsx Update Required

Line ~714 needs to change from:

```tsx
<SetlistManager
  songs={songs}
  setSongs={setSongs}
  onSelectSong={id => navigate(getSongDetailRoute(id))}
/>
```

To:

```tsx
<SetlistManager
  songs={songs}
  setSongs={setSongs}
  onSelectSong={id => navigate(getSongDetailRoute(id))}
  events={events} // ADD THIS
/>
```

## Success Criteria

| Metric                   | Target          |
| ------------------------ | --------------- |
| Design system typography | 100% compliance |
| Card component usage     | All containers  |
| Staggered animations     | Song list items |
| Gig countdown context    | When available  |
| Test coverage (new code) | ≥80%            |
| Accessibility violations | 0               |

## Session Handoff

When ending a session:

1. Commit all work with descriptive messages
2. Update `feature_list.json` with passing tests
3. Create `claude-progress.txt` with summary
4. Leave environment in clean, working state
