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

1. **AlphaTab Assets** - The `@coderline/alphatab-vite` plugin automatically copies font and soundfont assets during build. No manual setup needed.

2. **Supabase Required** - App fails without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. **Direct URL Access** - Handle missing resources gracefully (toast + redirect to `/`).

4. **TypeScript Strict** - Project uses `"strict": true`. Avoid `any`.

## Testing & Quality

**Commands:**
- `npm test` - Run Vitest tests
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint (zero warnings allowed)
- `npm run seed:test` - Seed test data for browser automation

Browser automation reads credentials from `test-credentials.json`. Test data isolated in dedicated band.

## Git Conventions

### Conventional Commits (Required)

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning via release-please.

**Format:** `type(scope?): subject`

| Type | Version Bump | Use For |
|------|--------------|---------|
| `feat:` | Minor (0.1.0 → 0.2.0) | New features |
| `fix:` | Patch (0.1.0 → 0.1.1) | Bug fixes |
| `feat!:` or `BREAKING CHANGE:` | Major (0.x → 1.0) | Breaking changes |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `perf:`, `build:` | None | No release triggered |

**Examples:**
```
feat(player): add loop section functionality
fix: resolve audio playback on iOS Safari
docs: update deployment guide
chore: upgrade dependencies
```

Commits are validated by commitlint via husky hook. PR titles are also validated in CI to follow the same format.

### Automated Versioning

When commits are pushed to `main`:
1. release-please analyzes commit messages
2. Creates/updates a Release PR with changelog
3. Merging the Release PR bumps version and creates GitHub Release
4. Version displays in Settings page (`__APP_VERSION__`)
