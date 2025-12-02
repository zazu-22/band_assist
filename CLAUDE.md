# CLAUDE.md

## Project Overview

Band Assist is a React SPA for band management—songs, charts, setlists, practice schedules, and member assignments. Uses Supabase for persistence and auth.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Supabase, AlphaTab (Guitar Pro rendering)

## Key Architecture

### Component Hierarchy

1. **Primitives** (`components/primitives/`) - Base shadcn/ui components, minimal modifications
2. **UI Components** (`components/ui/`) - Composed, reusable components
3. **Feature Components** - Page-level components

See [src/components/CLAUDE.md](src/components/CLAUDE.md) for component guidelines.

### Design System

Amber/gold theme with light+dark modes. See [docs/design-system.md](docs/design-system.md).

### Feature Specifications

See [specs/README.md](specs/README.md) for roadmap and [specs/CLAUDE.md](specs/CLAUDE.md) for spec workflow.

**⚠️ Important:** When completing a spec, you MUST update both `specs/README.md` AND `specs/STATUS.md`. See [specs/CLAUDE.md](specs/CLAUDE.md) for the full checklist.

## Project-Specific Patterns

### Navigation

Use explicit paths, avoid `navigate(-1)`:

```typescript
navigate(`/songs/${songId}`);
navigate('/', { replace: true }); // For redirects
```

### Auth & Multi-Band

- Supabase auth with session listener on mount
- Users can belong to multiple bands via `BandSelector`
- `currentBandId` tracks active band; band change triggers full data reload
- Always call `setCurrentBand()` before data operations

### State Updates

Use immutable updates:

```typescript
handleUpdateSong({ ...song, title: 'New Title' });
setSongs(songs.map(s => (s.id === id ? updated : s)));
```

## Common Pitfalls

1. **AlphaTab Assets** - Requires `/font` and `/soundfont` directories. Vite plugin copies these during build.

2. **Supabase Required** - App fails without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. **Direct URL Access** - Handle missing resources gracefully (toast + redirect to `/`).

4. **TypeScript Strict** - Project uses `"strict": true`. Avoid `any`.

## Testing

Browser automation reads credentials from `test-credentials.json`. Test data isolated in dedicated band (`npm run seed:test`).
