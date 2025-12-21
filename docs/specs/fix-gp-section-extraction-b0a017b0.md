# Specification: Fix GP Section Extraction Button

## 1. Overview
The "Extract from GP" button in the STRUCTURE tab is permanently disabled because the AlphaTab score object is not being passed from the AlphaTabRenderer through SongDetail to the StructureTab component. This fix establishes the data pipeline to expose the loaded score and enable automatic section marker extraction.

## 2. Problem Statement
Users cannot extract song sections from Guitar Pro files despite having the extraction logic fully implemented. The button remains greyed out with the tooltip "Load a GP chart to extract sections" even after a GP file is loaded and rendered. This is because:

1. **Missing data pipeline**: `AlphaTabRenderer` loads the score internally (`apiRef.current.score`) but never exposes it to parent components
2. **No score prop passed**: `SongDetail.tsx` renders `<StructureTab song={song} members={members} />` without an `alphaTabScore` prop
3. **Button logic depends on score**: The button is disabled when `!canExtractSections && !alphaTabScore` (line 315 of StructureTab.tsx)

The extraction logic in `sectionExtractor.ts` is correct and ready to use - it just needs access to the score data.

## 3. Goals
- Enable the "Extract from GP" button when a GP file with section markers is loaded
- Expose the AlphaTab score object via the existing imperative handle pattern (`AlphaTabHandle`)
- Maintain type safety between the AlphaTab library's Score type and our internal interfaces
- Flow score data: AlphaTabRenderer -> SongDetail -> StructureTab

## 4. Non-Goals
- Refactoring the section extraction algorithm (it works correctly)
- Adding new UI for section extraction (the UI exists and is functional)
- Modifying how sections are stored or displayed
- Supporting real-time section updates during playback
- Auto-extracting sections without user action

## 5. Requirements

### 5.1 Functional Requirements
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Add `getScore()` method to `AlphaTabHandle` interface | Method signature: `getScore(): AlphaTabScore \| null` where `AlphaTabScore` is the type from `sectionExtractor.ts` |
| FR-2 | Implement `getScore()` in AlphaTabRenderer | Returns the full score object from `apiRef.current?.score` cast to include `masterBars`, or null if not loaded |
| FR-3 | Store score in SongDetail state | When tracks are loaded (via `handleAlphaTabTracksLoaded`), capture score via `alphaTabRef.current?.getScore()` |
| FR-4 | Pass score to StructureTab | Add `alphaTabScore={alphaTabScore}` prop to `<StructureTab>` component |
| FR-5 | Clear score state on chart change | Reset `alphaTabScore` to null when switching away from GP charts or on unmount |

### 5.2 Technical Requirements
- **Type Compatibility**: The AlphaTab library's `Score` class contains BOTH `tracks: Track[]` AND `masterBars: MasterBar[]`. The internal `AlphaTabScore` type in `AlphaTabRenderer.tsx` (lines 25-28) only captures `{tracks, tempo}`, while `sectionExtractor.ts` expects `{masterBars}`. The actual library score has both, so we must cast appropriately.
- **Score object shape** (from AlphaTab library):
  ```typescript
  // Actual AlphaTab Score class includes:
  {
    tracks: Track[];           // Used by AlphaTabRenderer
    masterBars: MasterBar[];   // Used by sectionExtractor
    tempo: number;             // Getter property
    // ... other properties
  }
  ```
- **MasterBar.section** structure:
  ```typescript
  // AlphaTab Section class:
  {
    marker: string;  // Marker ID
    text: string;    // Display text (e.g., "Intro", "Verse 1")
  }
  ```
- Reuse the existing `AlphaTabScore` type from `@/lib/sectionExtractor` for the return type of `getScore()`. This type is already compatible with the extraction functions.

## 6. Implementation Approach

### Phase 1: Extend AlphaTabHandle Interface
1. **Import type**: Add `import { AlphaTabScore } from '@/lib/sectionExtractor'` to AlphaTabRenderer.tsx
2. **Extend interface**: Add to `AlphaTabHandle` interface (around line 287):
   ```typescript
   /**
    * Get the currently loaded score for section extraction.
    * @returns The score object with masterBars for extraction, or null if no score loaded
    */
   getScore(): AlphaTabScore | null;
   ```

### Phase 2: Implement getScore() in AlphaTabRenderer
1. **Add to handle object** (in `useMemo` around line 1278):
   ```typescript
   getScore: () => {
     // AlphaTab's internal score contains both tracks and masterBars
     // Cast to the extraction-compatible type which requires masterBars
     return apiRef.current?.score as unknown as AlphaTabScore | null ?? null;
   },
   ```
2. **Note on casting**: The actual AlphaTab `Score` class has `masterBars: MasterBar[]`. The internal `AlphaTabScore` type in this file (line 25-28) is incomplete but the runtime object has all properties. The cast via `unknown` is necessary because TypeScript doesn't know the full library type.

### Phase 3: Capture Score in SongDetail
1. **Add state** (around line 88):
   ```typescript
   const [alphaTabScore, setAlphaTabScore] = useState<AlphaTabScore | null>(null);
   ```
2. **Import type**: Add to imports from sectionExtractor
3. **Capture in callback** - Modify `handleAlphaTabTracksLoaded` (around line 106):
   ```typescript
   const handleAlphaTabTracksLoaded = useCallback((tracks: TrackInfo[]) => {
     if (preferredInstrument && tracks.length > 1) {
       const matchIndex = findMatchingTrackIndex(tracks, preferredInstrument);
       if (matchIndex !== null && alphaTabRef.current) {
         alphaTabRef.current.renderTrack(matchIndex);
       }
     }
     // Capture score for section extraction
     const score = alphaTabRef.current?.getScore() ?? null;
     setAlphaTabScore(score);
   }, [preferredInstrument]);
   ```

### Phase 4: Pass Score to StructureTab
1. **Update component** (around line 864 in the STRUCTURE tab case):
   ```tsx
   <StructureTab
     song={song}
     members={members}
     alphaTabScore={alphaTabScore}
   />
   ```

### Phase 5: Clear Score on Chart Change
1. **Reset state when chart changes** - Add effect or update existing logic where `activeChartId` changes to clear the score when switching away from GP charts
2. **Clear on unmount** of AlphaTabRenderer (already handled by component lifecycle)

## 7. Edge Cases and Error Handling
| Scenario | Expected Behavior |
|----------|-------------------|
| GP file has no section markers | Button enabled but clicking shows "No section markers found" toast (existing behavior) |
| GP file fails to load | Score remains null, button stays disabled with appropriate tooltip |
| User switches from GP chart to PDF chart | Score state cleared, button disabled |
| User switches between GP charts | New score loaded, button enabled if markers exist |
| Score loads but masterBars is empty | `scoreHasSectionMarkers()` returns false, button disabled with "No section markers found" tooltip |
| AlphaTabRenderer destroyed before score loads | `getScore()` returns null, no state update |
| Rapid chart switching | Only final score state persists (React handles batching) |

## 8. Testing Strategy
- **Unit tests**:
  - Test `getScore()` returns null when API not initialized
  - Test `getScore()` returns score object when loaded
  - Verify type compatibility between returned score and sectionExtractor functions
- **Integration tests**:
  - Load GP file with section markers -> verify button becomes enabled
  - Load GP file without markers -> verify button shows appropriate tooltip
  - Switch from GP to PDF chart -> verify button becomes disabled
  - Click enabled button -> verify sections are extracted
- **Manual validation**:
  - Test with real GP files containing section markers (use test files from the project)
  - Verify the extraction flow works end-to-end
  - Check that extracted sections display correctly in the section list
  - Test on mobile browsers for touch target accessibility

## 9. Files to Modify/Create
| File | Action | Description |
|------|--------|-------------|
| `src/components/AlphaTabRenderer.tsx` | Modify | Import `AlphaTabScore` from sectionExtractor, add `getScore()` to interface and implement in handle object |
| `src/components/SongDetail.tsx` | Modify | Add `alphaTabScore` state, import type, capture score in tracks callback, pass to StructureTab |
| `src/lib/sectionExtractor.ts` | No change | Existing type and functions are correct - `AlphaTabScore` interface already defines `{ masterBars: AlphaTabMasterBar[] }` |
| `src/components/structure/StructureTab.tsx` | No change | Already accepts optional `alphaTabScore` prop and handles it correctly |
| `src/components/LazyAlphaTab.tsx` | Modify | Re-export `AlphaTabScore` type from sectionExtractor for consumers using the lazy-loaded component |

## 10. Open Questions
None - all requirements are clear based on the codebase analysis:

1. **Type mismatch resolved**: The AlphaTab library `Score` class contains BOTH `tracks` AND `masterBars`. The internal type definitions in our codebase are subsets that each capture only what they need. The runtime object from `apiRef.current.score` has all properties, so we cast through `unknown` to the sectionExtractor's `AlphaTabScore` type for type safety.

2. **sectionExtractor.ts modification**: Not needed - the existing `AlphaTabScore` interface (`{ masterBars: AlphaTabMasterBar[] }`) is correct for section extraction and matches what the AlphaTab library provides.

3. **getScore() return type**: Uses `AlphaTabScore` from `@/lib/sectionExtractor` which expects `masterBars`. The actual AlphaTab Score object has this property at runtime.
