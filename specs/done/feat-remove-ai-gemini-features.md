# Remove AI/Gemini Features

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Done                                        |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-12-01                                  |
| **Updated** | 2025-12-02                                  |
| **Completed** | 2025-12-02                                |
| **Priority**| High                                        |
| **Type**    | Feature Removal / Cleanup                   |

---

## Overview

Remove all Google Gemini AI features from the Band Assist application. The AI features (Studio Assistant chat and setlist suggestions) are not providing sufficient value and take up unnecessary UI space, particularly the right sidebar on the song detail page.

### Current State

- `@google/genai` package installed (v1.30.0)
- `geminiService.ts` provides three AI functions
- SongDetail page has a right sidebar "Studio Assistant" chat interface
- SetlistManager has "AI Suggestions" button in action bar
- Environment variable `VITE_GEMINI_API_KEY` configured in types
- Vite config defines `process.env.API_KEY` and `process.env.GEMINI_API_KEY`

### Desired State

- All AI-related code removed
- `@google/genai` dependency removed
- SongDetail page reclaims right sidebar space for content
- SetlistActionBar simplified to just "Add Song" button
- No AI-related environment variables or build configuration
- Cleaner, simpler codebase

---

## Scope

| Component | Action |
| --------- | ------ |
| `package.json` | Remove `@google/genai` dependency |
| `src/services/geminiService.ts` | Delete entire file |
| `src/components/SongDetail.tsx` | Remove AI sidebar, state, handler |
| `src/components/SetlistManager.tsx` | Remove AI suggestion logic |
| `src/components/setlist/SetlistActionBar.tsx` | Remove AI button and related props |
| `src/vite-env.d.ts` | Remove `VITE_GEMINI_API_KEY` |
| `vite.config.ts` | Remove `process.env.API_KEY` and `process.env.GEMINI_API_KEY` defines |
| `docs/README.md` | Update if AI features are documented |
| `.env.example` (if exists) | Remove Gemini API key reference |

---

## Implementation Details

### 1. Remove Package Dependency

**File:** `package.json`

Remove from dependencies:
```json
"@google/genai": "^1.30.0",
```

Run `npm install` to update lockfile.

### 2. Delete Gemini Service

**Action:** Delete `src/services/geminiService.ts` entirely.

This file contains:
- `getMusicAnalysis()` - Used by SongDetail and SetlistManager
- `extractPracticePlan()` - Unused in UI
- `extractSongParts()` - Unused in UI

### 3. Update SongDetail Component

**File:** `src/components/SongDetail.tsx`

**Remove imports:**
```typescript
// Remove this line
import { getMusicAnalysis } from '@/services/geminiService';
```

**Remove state variables:**
```typescript
// Remove these lines (around line 69-71)
const [aiChat, setAiChat] = useState('');
const [aiResponse, setAiResponse] = useState('');
const [loadingAi, setLoadingAi] = useState(false);
```

**Remove handler function:**
```typescript
// Remove handleAskAI function (lines 125-144)
const handleAskAI = async (specificPrompt?: string) => { ... };
```

**Remove right sidebar JSX:**
```typescript
// Remove entire AI sidebar section (lines 1056-1119)
{/* Right Sidebar: AI Assistant */}
<div className="w-full lg:w-96 bg-card border-l border-border...">
  ...
</div>
```

**Adjust layout:**
The main content area currently shares space with the AI sidebar. Update the layout to use full width:
- Remove `lg:w-96` constraint from main content container if present
- Ensure proper responsive layout without sidebar

### 4. Update SetlistManager Component

**File:** `src/components/SetlistManager.tsx`

**Remove import:**
```typescript
// Remove this line
import { getMusicAnalysis } from '@/services/geminiService';
```

**Remove state:**
```typescript
// Remove this line (around line 110)
const [loadingSuggestion, setLoadingSuggestion] = useState(false);
```

**Remove AI suggestion function:**
```typescript
// Remove askAiForSuggestions function (lines 177-192)
const askAiForSuggestions = useCallback(async () => { ... }, [songs]);
```

**Update SetlistActionBar usage:**
```typescript
// Remove these props from SetlistActionBar
onAiSuggestions={askAiForSuggestions}
isLoadingSuggestions={loadingSuggestion}
```

### 5. Simplify SetlistActionBar Component

**File:** `src/components/setlist/SetlistActionBar.tsx`

**Update interface:**
```typescript
// Change from:
export interface SetlistActionBarProps {
  onAddSong: () => void;
  onAiSuggestions: () => void;
  isLoadingSuggestions: boolean;
}

// To:
export interface SetlistActionBarProps {
  onAddSong: () => void;
}
```

**Remove Sparkles import:**
```typescript
// Change from:
import { Plus, Sparkles } from 'lucide-react';

// To:
import { Plus } from 'lucide-react';
```

**Simplify component:**
```typescript
export const SetlistActionBar = memo(function SetlistActionBar({
  onAddSong,
}: SetlistActionBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-serif text-foreground">Songs</h3>
      <Button onClick={onAddSong} className="gap-2">
        <Plus size={18} />
        Add Song
      </Button>
    </div>
  );
});
```

### 6. Update Type Definitions

**File:** `src/vite-env.d.ts`

```typescript
// Change from:
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
}

// To:
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}
```

### 7. Update Vite Config

**File:** `vite.config.ts`

Remove the `define` block entirely:
```typescript
// Remove this entire block:
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```

### 8. Update Documentation (if needed)

**File:** `docs/README.md`

Check for and remove any references to AI/Gemini features.

---

## User Experience Changes

### Before
- SongDetail page split between content and AI sidebar
- Limited horizontal space for chart viewing on song pages
- "AI Suggestions" button in setlist view
- Users may attempt to use AI features that require API key

### After
- Full-width content area on SongDetail page
- More space for charts, tabs, and song information
- Simpler setlist interface with just "Add Song" button
- Reduced cognitive load (no unused features)

---

## Testing Strategy

### Manual Testing

1. **SongDetail page renders without AI sidebar**
   - Navigate to any song detail page
   - Verify no "Studio Assistant" sidebar appears
   - Verify full-width layout for content

2. **SetlistManager works without AI**
   - Navigate to setlist view
   - Verify "AI Suggestions" button is gone
   - Verify "Add Song" button works correctly

3. **Build succeeds**
   - Run `npm run build`
   - Verify no errors related to missing imports or types

4. **TypeScript passes**
   - Run `npm run typecheck`
   - Verify no type errors

5. **Lint passes**
   - Run `npm run lint`
   - Verify no linting errors from removed code

### Automated Tests

No new tests needed. Existing tests may need updates if they reference:
- `getMusicAnalysis` function
- AI-related state variables
- SetlistActionBar props

Check for test files that may need updates:
```bash
grep -r "geminiService\|getMusicAnalysis\|aiResponse\|loadingSuggestion" src/**/*.test.ts*
```

---

## Performance Considerations

- **Reduced bundle size:** Removing `@google/genai` package will reduce JavaScript bundle
- **Faster load times:** Less code to parse and execute
- **Simpler state:** Fewer useState hooks and less re-rendering logic

---

## Security Considerations

- **Removed API key exposure risk:** No longer need to manage Gemini API key
- **Reduced attack surface:** No external API calls to maintain

---

## Documentation Updates

1. Update `CLAUDE.md` if it references AI features in the tech stack
2. Remove any AI-related environment variable documentation
3. Update README if it mentions Gemini integration

---

## Implementation Phases

### Phase 1: Core Removal (All changes in one PR)

1. Remove `@google/genai` from package.json
2. Delete geminiService.ts
3. Update SongDetail.tsx (remove AI sidebar and handlers)
4. Update SetlistManager.tsx (remove AI suggestion logic)
5. Simplify SetlistActionBar.tsx
6. Update vite-env.d.ts and vite.config.ts
7. Run typecheck and lint to verify clean removal
8. Update any affected tests

---

## Open Questions

None - this is a straightforward removal of unused features.

---

## References

### Files to Delete
- `src/services/geminiService.ts`

### Files to Modify
- `package.json`
- `src/components/SongDetail.tsx`
- `src/components/SetlistManager.tsx`
- `src/components/setlist/SetlistActionBar.tsx`
- `src/vite-env.d.ts`
- `vite.config.ts`

### Documentation Files (check for updates)
- `docs/README.md`
- `CLAUDE.md`
- `docs/ai_docs/implementation_summaries/shadcn_migration_progress.md`

---

## Success Criteria

- [ ] `@google/genai` removed from package.json
- [ ] `geminiService.ts` deleted
- [ ] SongDetail page has no AI sidebar
- [ ] SetlistActionBar has no AI button
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Bundle size reduced (verify with build output)
