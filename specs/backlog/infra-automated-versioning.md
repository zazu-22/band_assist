# Automated Versioning with Release-Please

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Backlog                                     |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-01                                  |
| **Updated** | 2025-12-01                                  |
| **Priority**| Medium                                      |
| **Type**    | Infrastructure                              |

---

## Overview

Implement fully automated semantic versioning using Google's release-please. This enables coding agents to automatically trigger appropriate version bumps through conventional commit messages, eliminating manual version management.

### Current State

- `release.yml` workflow exists but requires manual tag pushing or workflow dispatch
- Version in `package.json` is `0.1.0` and manually maintained
- No enforcement of commit message format
- Version not exposed in the application UI

### Desired State

- Commits with conventional format automatically determine version bumps
- Release PRs are created automatically with changelogs
- Merging a Release PR triggers tag creation and GitHub Release
- Version is visible in the application (e.g., settings page footer)
- Commit format is enforced via commitlint

---

## How Conventional Commits Determine Version

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | Patch (1.0.0 → 1.0.1) | `fix(auth): resolve login redirect` |
| `feat:` | Minor (1.0.0 → 1.1.0) | `feat(upload): add drag-and-drop` |
| `feat!:` or `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) | `feat!: redesign API` |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:` | No release | `docs: update README` |

---

## Scope

| Component | Changes |
| --------- | ------- |
| `.github/workflows/release-please.yml` | New workflow for automated release PR creation |
| `.github/workflows/release.yml` | Modify to trigger on release-please merge |
| `release-please-config.json` | Configuration for release-please |
| `.release-please-manifest.json` | Version tracking manifest |
| `vite.config.ts` | Expose `__APP_VERSION__` global |
| `src/vite-env.d.ts` | TypeScript declaration for version |
| `src/components/Settings.tsx` | Display version in settings footer |
| `commitlint.config.js` | Conventional commit enforcement |
| `.husky/commit-msg` | Git hook for commitlint |
| `package.json` | Add commitlint devDependencies |

---

## Implementation Details

### 1. Add release-please Workflow

**File:** `.github/workflows/release-please.yml`

```yaml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
      version: ${{ steps.release.outputs.version }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

### 2. Add release-please Configuration

**File:** `release-please-config.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "packages": {
    ".": {
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true,
      "include-component-in-tag": false,
      "include-v-in-tag": true
    }
  }
}
```

**File:** `.release-please-manifest.json`

```json
{
  ".": "0.1.0"
}
```

### 3. Modify Existing release.yml

Update trigger to run when release-please creates a release:

```yaml
name: Release

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.0.0)'
        required: true
        type: string
```

Remove the tag trigger since release-please handles that.

### 4. Expose Version in Vite

**File:** `vite.config.ts` (add to defineConfig)

```typescript
import { defineConfig } from 'vite';
import { version } from './package.json';

export default defineConfig({
  // ... existing config
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
```

**File:** `src/vite-env.d.ts` (add declaration)

```typescript
declare const __APP_VERSION__: string;
```

### 5. Display Version in Settings

**File:** `src/components/Settings.tsx`

Add to the bottom of the settings page:

```tsx
<div className="mt-8 pt-4 border-t border-border">
  <p className="text-xs text-muted-foreground text-center font-mono">
    Band Assist v{__APP_VERSION__}
  </p>
</div>
```

### 6. Add Commitlint (Optional but Recommended)

**Install dependencies:**

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

**File:** `commitlint.config.js`

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting (no code change)
        'refactor', // Code change (no new feature or fix)
        'perf',     // Performance improvement
        'test',     // Adding tests
        'chore',    // Maintenance
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
```

**File:** `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

Make executable:

```bash
chmod +x .husky/commit-msg
```

---

## Workflow Diagram

```
Developer/Agent commits with conventional format
        ↓
Push to main branch
        ↓
release-please analyzes commits since last release
        ↓
Creates/updates "Release PR" with:
  - Version bump (based on commit types)
  - Generated CHANGELOG.md
  - Updated package.json version
        ↓
Developer reviews and merges Release PR
        ↓
release-please creates git tag (e.g., v1.2.0)
        ↓
GitHub Release is created automatically
        ↓
release.yml workflow triggers (optional additional steps)
        ↓
Vercel deploys from main (existing workflow)
```

---

## Testing Plan

1. **Verify release-please workflow runs** - Push to main, check Actions tab
2. **Verify Release PR creation** - Make a `feat:` commit, confirm PR appears
3. **Verify changelog generation** - Check PR body for formatted changelog
4. **Verify version bump logic** - Test with `fix:`, `feat:`, and `feat!:` commits
5. **Verify tag creation** - Merge Release PR, confirm tag is created
6. **Verify version in app** - Check settings page shows correct version
7. **Verify commitlint** - Try invalid commit message, confirm rejection

---

## Dependencies

- `@commitlint/cli` (devDependency)
- `@commitlint/config-conventional` (devDependency)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Coding agents use non-conventional commits | Commitlint enforces format at commit time |
| Accidental major version bump | Review Release PR before merging |
| Release-please conflicts with existing release.yml | Modify release.yml to trigger on `release: published` event |

---

## Success Criteria

- [ ] release-please workflow creates Release PRs automatically
- [ ] Version bumps correctly based on commit types
- [ ] CHANGELOG.md is generated and maintained
- [ ] Version is visible in the app settings
- [ ] Commitlint rejects non-conventional commits
- [ ] Existing Vercel deployment continues to work
