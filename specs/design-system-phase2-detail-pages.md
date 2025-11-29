# Design System Extension - Phase 2: Detail Pages

| Field       | Value                                       |
| ----------- | ------------------------------------------- |
| **Status**  | Ready                                       |
| **Authors** | Claude (AI Assistant)                       |
| **Created** | 2025-11-29                                  |
| **Updated** | 2025-11-29                                  |
| **Parent**  | `specs/feat-extend-design-system-app-wide.md` |
| **Depends** | Phase 1 (recommended but not required)      |

---

## Overview

Phase 2 applies design system consistency to detail-level pages: SongDetail (already partially compliant) and InvitationManager (nested component). These require lighter-touch changes focused on typography hierarchy and card pattern alignment.

---

## Scope

| Component              | Changes                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `SongDetail.tsx`       | Typography sizing, card title consistency, left-border accents |
| `InvitationManager.tsx`| Badge styling standardization, list item hover patterns    |

---

## Pre-Implementation Verification

Before starting each component, verify:

1. **`cn()` utility is imported** - Check for `import { cn } from '@/lib/utils'`
2. **Existing patterns preserved** - SongDetail already has some design system patterns; don't break them

---

## Implementation Details

### 1. SongDetail.tsx

**File:** `src/components/SongDetail.tsx`

**Context:** This component is already partially compliant. Changes are focused on consistency improvements.

#### A. Song Title (~Line 400)

Increase size and add tracking:

```diff
- <h2 className="text-2xl font-bold font-serif text-foreground flex items-center gap-3">
+ <h2 className="text-3xl font-bold font-serif text-foreground tracking-tight flex items-center gap-3">
```

#### B. AI Assistant Sidebar Header (~Lines 1057-1062)

Add serif and proper sizing:

```diff
- <h3 className="font-bold text-foreground flex items-center gap-2">
+ <h3 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
```

#### C. Assignments Card Title (~Line 856)

Add bold weight for consistency:

```diff
- <h3 className="text-xl font-serif text-foreground">Band Assignments</h3>
+ <h3 className="text-xl font-bold font-serif text-foreground">Band Assignments</h3>
```

#### D. Member Assignment Cards (~Lines 870-887)

Add left-border accent and hover state:

```diff
- <div
-   key={member.id}
-   className="bg-muted/30 border border-border rounded-xl p-5 flex flex-col h-full"
- >
+ <div
+   key={member.id}
+   className={cn(
+     'border border-border rounded-xl p-5 flex flex-col h-full',
+     'border-l-[3px] border-l-primary/60 hover:bg-muted/20 transition-colors'
+   )}
+ >
```

#### E. Audio Card Titles (~Lines 987-989, 1030)

Add tracking for consistency:

```diff
- <h3 className="text-2xl font-bold font-serif text-foreground">
+ <h3 className="text-2xl font-bold font-serif text-foreground tracking-tight">
```

---

### 2. InvitationManager.tsx

**File:** `src/components/InvitationManager.tsx`

**Context:** This is a nested component used within Settings. Changes standardize badge styling and add hover patterns.

#### A. Status Badge Styling (~Lines 61-68)

The existing `getStatusBadgeStyle` function uses custom colors. Update to use semantic color variables with consistent opacity:

**Option 1: Update the existing function**

```diff
function getStatusBadgeStyle(status: string): string {
  const styles = {
-   pending: 'bg-warning/20 text-warning border-warning/30',
-   accepted: 'bg-success/20 text-success border-success/30',
-   cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
+   pending: 'bg-warning/10 text-warning border-warning/30',
+   accepted: 'bg-success/10 text-success border-success/30',
+   cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  };
  return styles[status as keyof typeof styles] || styles.pending;
}
```

**Note:** The existing function already uses semantic colors correctly. The change is primarily to standardize opacity from `/20` to `/10` to match other design system badges. If the current styling looks good, this change is optional.

#### B. Invitation List Items

Find the invitation list rendering (likely in the map over `invitations`) and add hover pattern:

```diff
- <div className="p-3 rounded-lg border border-border">
+ <div className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
```

If the component uses Card components instead, ensure they have the hover state applied.

#### C. Section Headers (if present)

If there are any section headers/titles in the component, apply serif font:

```diff
- <h3 className="font-bold">Pending Invitations</h3>
+ <h3 className="font-bold font-serif">Pending Invitations</h3>
```

---

## Verification Checklist

### SongDetail.tsx Verification

- [ ] **Song Title:** Uses `text-3xl font-bold font-serif tracking-tight`
- [ ] **AI Assistant Header:** Uses `text-lg font-bold font-serif`
- [ ] **Assignments Title:** Uses `text-xl font-bold font-serif`
- [ ] **Member Cards:** Have `border-l-[3px] border-l-primary/60` accent
- [ ] **Member Cards:** Have `hover:bg-muted/20 transition-colors`
- [ ] **Audio Card Titles:** Include `tracking-tight`
- [ ] **Existing Patterns Preserved:** Tab navigation, metadata cards, status badges still work

### InvitationManager.tsx Verification

- [ ] **Badge Colors:** Use semantic color variables (warning/success/destructive)
- [ ] **List Items:** Have `hover:bg-muted/30 transition-colors`
- [ ] **Section Headers:** Use `font-serif` if present

### Cross-Browser Testing

Test in:
- [ ] Chrome (macOS)
- [ ] Firefox (macOS)
- [ ] Safari (macOS)

### Responsive Testing

Test at breakpoints:
- [ ] Mobile: 375px
- [ ] Tablet: 768px
- [ ] Desktop: 1440px

### Functional Regression

- [ ] **SongDetail:** All tabs render (Charts, Audio, Notes, Assignments)
- [ ] **SongDetail:** Song metadata edit works
- [ ] **SongDetail:** AI Assistant panel opens/closes
- [ ] **SongDetail:** Audio playback controls work
- [ ] **InvitationManager:** Can send new invitations
- [ ] **InvitationManager:** Can cancel pending invitations
- [ ] **InvitationManager:** Status badges display correctly

---

## Test Commands

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests (if applicable)
npm test

# Start dev server for manual testing
npm run dev
```

---

## Success Criteria

Phase 2 is complete when:

1. Both components pass the verification checklist
2. No TypeScript errors
3. No ESLint warnings introduced
4. All functional regression tests pass
5. Typography hierarchy is consistent with Phase 1 components
6. Card patterns match the established design system

---

## Notes

### SongDetail Complexity

SongDetail is a large component (~1100+ lines). Take care when making edits to:
- Verify line numbers before editing (they may have shifted)
- Use search to find the exact elements to modify
- Test thoroughly as this is a heavily-used page

### InvitationManager Nesting

InvitationManager is rendered within Settings.tsx. Test the component both:
- In isolation (if possible)
- Within the Settings page context

---

## Rollback Plan

If issues are discovered post-merge:

1. Revert the PR
2. Document the specific issue
3. Fix in a new branch before re-attempting

All changes are CSS-only and should not affect functionality.
