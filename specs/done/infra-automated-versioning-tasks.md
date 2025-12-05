# Task Breakdown: Automated Versioning with Release-Please

**Generated**: 2025-12-04
**Source**: specs/pending/infra-automated-versioning.md
**Priority**: Medium
**Type**: Infrastructure

---

## Overview

Implement fully automated semantic versioning using Google's release-please. This enables coding agents to automatically trigger appropriate version bumps through conventional commit messages, eliminating manual version management.

**Key Deliverables**:
1. release-please GitHub Action workflow
2. Configuration files for release-please
3. Modified release.yml to trigger on releases
4. Version exposed in Vite build and displayed in Settings
5. Enhanced commitlint integration (optional enhancement to existing hook)

---

## Phase 1: Release-Please Core Setup

### Task 1.1: Create release-please GitHub Action Workflow

**Description**: Create the release-please workflow that analyzes conventional commits and creates Release PRs automatically
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Trigger on push to main branch
- Requires `contents: write` and `pull-requests: write` permissions
- Must output `release_created`, `tag_name`, and `version` for downstream use
- Uses googleapis/release-please-action@v4

**Implementation**:

Create file `.github/workflows/release-please.yml`:

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

**Acceptance Criteria**:
- [ ] Workflow file exists at `.github/workflows/release-please.yml`
- [ ] Workflow triggers on push to main
- [ ] Correct permissions are set (contents: write, pull-requests: write)
- [ ] Outputs are properly defined for downstream workflows
- [ ] Uses release-please-action v4

---

### Task 1.2: Create release-please Configuration Files

**Description**: Create the configuration and manifest files that control release-please behavior
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1

**Technical Requirements**:
- Configuration file defines release behavior (changelog path, version strategy, etc.)
- Manifest file tracks current version
- Must sync with package.json version (currently 0.1.0)
- Use `bump-minor-pre-major: true` for pre-1.0 version behavior
- Include v prefix in tags (`include-v-in-tag: true`)

**Implementation**:

Create file `release-please-config.json`:

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

Create file `.release-please-manifest.json`:

```json
{
  ".": "0.1.0"
}
```

**Configuration Options Explained**:
- `release-type: "node"` - Updates package.json version automatically
- `bump-minor-pre-major: true` - Breaking changes before v1.0.0 only bump minor
- `bump-patch-for-minor-pre-major: true` - Features before v1.0.0 only bump patch
- `include-v-in-tag: true` - Tags will be `v1.0.0` format
- `include-component-in-tag: false` - Single package, no component prefix needed

**Acceptance Criteria**:
- [ ] `release-please-config.json` exists with proper schema reference
- [ ] `.release-please-manifest.json` exists with version "0.1.0"
- [ ] Configuration matches package.json version
- [ ] Schema validates correctly

---

## Phase 2: Update Existing Release Workflow

### Task 2.1: Modify release.yml to Trigger on Release Events

**Description**: Update the existing release.yml to trigger when release-please creates a GitHub Release instead of on tag push
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: Task 3.1, Task 3.2

**Technical Requirements**:
- Change trigger from `push: tags: ['v*.*.*']` to `release: types: [published]`
- Keep `workflow_dispatch` for manual releases
- Remove redundant tag creation logic (release-please handles this)
- Update version extraction logic to use release event data

**Current State** (`.github/workflows/release.yml` lines 1-12):
```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.0.0)'
        required: true
        type: string
```

**Implementation - Replace trigger section**:

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

**Update version extraction step** (replace lines 32-41):

```yaml
      - name: Get version
        id: version
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            # For release events, extract version from tag
            VERSION="${{ github.event.release.tag_name }}"
            VERSION=${VERSION#v}  # Remove 'v' prefix
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Releasing version: $VERSION"
```

**Acceptance Criteria**:
- [ ] Workflow triggers on `release: types: [published]`
- [ ] Workflow still supports `workflow_dispatch` for manual releases
- [ ] Version extraction works correctly for both trigger types
- [ ] No duplicate release creation (release-please creates the release, this workflow performs post-release actions)

---

## Phase 3: Version Display in Application

### Task 3.1: Expose Version in Vite Build

**Description**: Configure Vite to expose package.json version as a global constant available at runtime
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, Task 3.2

**Technical Requirements**:
- Import version from package.json
- Define `__APP_VERSION__` as global constant
- Version must be JSON-stringified for proper string handling
- TypeScript must know about this global

**Current State** (`vite.config.ts`):
```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { alphaTab } from '@coderline/alphatab/vite';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      alphaTab({
        // Use default asset paths:
        // - Fonts copied to /font
        // - Soundfont copied to /soundfont
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
```

**Implementation - Updated vite.config.ts**:

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { alphaTab } from '@coderline/alphatab/vite';
import pkg from './package.json';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      alphaTab({
        // Use default asset paths:
        // - Fonts copied to /font
        // - Soundfont copied to /soundfont
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
  };
});
```

**Note**: May need to add `"resolveJsonModule": true` to tsconfig.json if not already present.

**Acceptance Criteria**:
- [ ] `__APP_VERSION__` is defined in Vite config
- [ ] Version is correctly stringified
- [ ] Build completes without errors
- [ ] Version is accessible at runtime

---

### Task 3.2: Add TypeScript Declaration for Version Global

**Description**: Add TypeScript declaration so `__APP_VERSION__` is recognized without errors
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, Task 3.1

**Current State** (`src/vite-env.d.ts`):
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Implementation - Add declaration**:

```typescript
/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Acceptance Criteria**:
- [ ] `__APP_VERSION__` is declared as a global string constant
- [ ] TypeScript compilation succeeds without errors
- [ ] No type errors when using `__APP_VERSION__` in components

---

### Task 3.3: Display Version in Settings Page

**Description**: Add version display to the Settings page footer
**Size**: Small
**Priority**: Medium
**Dependencies**: Task 3.1, Task 3.2
**Can run parallel with**: Task 4.1

**Technical Requirements**:
- Display version at the bottom of Settings page
- Use muted styling consistent with design system
- Use monospace font for version string
- Position after all tab content but before dialogs

**Implementation**:

Add to `src/components/Settings.tsx` after the closing `</Tabs>` tag (around line 544) and before the ConfirmDialog:

```tsx
      </Tabs>

      {/* Version Footer */}
      <div className="mt-8 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center font-mono">
          Band Assist v{__APP_VERSION__}
        </p>
      </div>

      {/* Confirm Dialog */}
```

**Full context - Insert between line 544 and 546**:

Current:
```tsx
      </Tabs>

      {/* Confirm Dialog */}
      <ConfirmDialog
```

After:
```tsx
      </Tabs>

      {/* Version Footer */}
      <div className="mt-8 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center font-mono">
          Band Assist v{__APP_VERSION__}
        </p>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
```

**Acceptance Criteria**:
- [ ] Version is displayed at bottom of Settings page
- [ ] Styling matches design system (muted, small, centered, monospace)
- [ ] Version updates correctly when package.json changes
- [ ] Display works in both light and dark modes

---

## Phase 4: Enhanced Commitlint (Optional)

### Task 4.1: Add Commitlint Dependencies and Configuration

**Description**: Install commitlint packages and create configuration file for more robust commit message validation
**Size**: Medium
**Priority**: Low (enhancement to existing shell-based validation)
**Dependencies**: None
**Can run parallel with**: Task 3.3

**Technical Requirements**:
- Install `@commitlint/cli` and `@commitlint/config-conventional` as devDependencies
- Create `commitlint.config.js` with customized rules
- Allows for more nuanced validation than the existing shell script

**Note**: The project already has basic commit validation in `.husky/commit-msg` using shell grep. This task enhances that with commitlint for:
- Better error messages
- More configurable rules
- Standard tooling that other developers will recognize

**Implementation**:

Install dependencies:
```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

Create file `commitlint.config.js`:

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

**Acceptance Criteria**:
- [ ] `@commitlint/cli` is installed as devDependency
- [ ] `@commitlint/config-conventional` is installed as devDependency
- [ ] `commitlint.config.js` exists with proper configuration
- [ ] Package.json includes new devDependencies

---

### Task 4.2: Update Husky Hook for Commitlint

**Description**: Update the existing husky commit-msg hook to use commitlint instead of shell-based validation
**Size**: Small
**Priority**: Low
**Dependencies**: Task 4.1

**Current State** (`.husky/commit-msg`):
- Shell-based validation using grep
- Basic conventional commit format checking
- 52 lines of shell script

**Implementation - Replace `.husky/commit-msg`**:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

**Acceptance Criteria**:
- [ ] Hook uses commitlint instead of shell validation
- [ ] Invalid commits are rejected with helpful error messages
- [ ] Valid commits pass through successfully
- [ ] Merge and revert commits are handled by commitlint (not custom logic)

---

## Testing Plan

### Integration Tests (Manual)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Verify release-please workflow runs | Push to main, check Actions tab | Workflow executes successfully |
| Verify Release PR creation | Make a `feat:` commit, push to main | Release PR is created |
| Verify changelog generation | Check Release PR body | Formatted changelog with features/fixes |
| Verify version bump logic | Test with `fix:`, `feat:`, `feat!:` | Correct version bumps applied |
| Verify tag creation | Merge Release PR | Git tag (e.g., v0.2.0) is created |
| Verify release creation | Merge Release PR | GitHub Release is published |
| Verify version in app | Check Settings page | Shows correct version (e.g., v0.2.0) |
| Verify commitlint | Try invalid commit message | Commit is rejected with helpful error |
| Verify existing workflow | Manual dispatch release.yml | Still works for manual releases |

### Version Display Tests (Manual)

1. **Development mode**: `npm run dev` - Check Settings page shows version
2. **Production build**: `npm run build && npm run preview` - Verify version in built app
3. **Version update**: Change package.json version, rebuild - Verify new version displays

---

## Dependency Graph

```
Phase 1 (Foundation):
  Task 1.1 (release-please workflow) ─┬─→ Task 2.1 (update release.yml)
  Task 1.2 (config files) ────────────┘

Phase 3 (Version Display):
  Task 3.1 (vite config) ───┬─→ Task 3.3 (Settings UI)
  Task 3.2 (TS declaration) ┘

Phase 4 (Optional Enhancement):
  Task 4.1 (commitlint deps) → Task 4.2 (husky update)
```

**Parallel Execution Opportunities**:
- Tasks 1.1 and 1.2 can run in parallel
- Tasks 3.1 and 3.2 can run in parallel
- Phase 3 can run in parallel with Phase 2
- Phase 4 can run in parallel with Phases 2 and 3

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Release-please conflicts with existing release.yml | Medium | Medium | Modified release.yml triggers on `release: published` not tags |
| Coding agents use non-conventional commits | Low | Low | Commitlint enforces format at commit time |
| Accidental major version bump | Low | Medium | Review Release PR before merging |
| Vite version import breaks build | Low | High | Test build after adding define config |

---

## Summary

| Phase | Tasks | Priority | Total Size |
|-------|-------|----------|------------|
| Phase 1: Release-Please Core | 2 | High | Small |
| Phase 2: Update Release Workflow | 1 | High | Medium |
| Phase 3: Version Display | 3 | Medium | Small |
| Phase 4: Enhanced Commitlint | 2 | Low | Medium |
| **Total** | **8 tasks** | | |

**Recommended Execution Order**:
1. Tasks 1.1 + 1.2 (parallel) - Foundation
2. Tasks 3.1 + 3.2 (parallel) - Can start immediately, no dependencies
3. Task 2.1 - After Phase 1 complete
4. Task 3.3 - After 3.1 and 3.2 complete
5. Tasks 4.1 + 4.2 (sequential) - Optional enhancement, can be deferred
