# Specification: Phase 2 - Section Assignments

| Field       | Value                    |
| ----------- | ------------------------ |
| **Status**  | Active                   |
| **Authors** | Claude & Jason           |
| **Created** | 2025-12-15               |
| **Updated** | 2025-12-15               |
| **Priority**| High                     |
| **Type**    | Feature                  |
| **Effort**  | Medium (3-4 days)        |
| **Parent**  | feat-song-collaboration-architecture.md |
| **GitHub**  | Issue #196               |

---

## 1. Overview

Section Assignments extends the Phase 1 Song Sections feature to allow band members to be assigned specific roles within each section of a song. This creates a "who plays what when" system that clarifies responsibilities during practice and performance, tracks playing/resting status per member, and displays personalized assignment information to each user.

## 2. Problem Statement

With Phase 1 complete, songs now have structural sections (Intro, Verse, Chorus, Solo, etc.). However, band members still have no way to:

- **Know their role per section**: Does Mike rest during the guitar solo? Does Jason play lead or rhythm in the bridge?
- **See section-specific notes**: "Watch tempo here" or "Use palm muting" tied to their specific assignment
- **Visualize activity at a glance**: Which sections have full band participation vs. sparse arrangements
- **Practice with context**: When practicing a section, know exactly what they should be playing

This leads to confusion during rehearsals, verbal agreements that get forgotten, and inefficient practice sessions where members aren't sure what to focus on.

## 3. Goals

- Allow assigning band members to sections with specific roles (Lead Guitar, Rhythm Guitar, etc.)
- Support three assignment statuses: **playing**, **resting**, **optional**
- Display visual activity indicators showing member participation at a glance
- Show "Your Assignment" information to logged-in users for each section
- Store section-specific notes per assignment (e.g., "Use capo on 3rd fret")
- Integrate seamlessly with existing StructureTab and SectionCard components
- Enable filtering/viewing sections by assignment status

## 4. Non-Goals

- **Real-time collaborative editing**: Assignments are not synced in real-time (poll-based refresh is acceptable)
- **GP track auto-assignment**: Automatically mapping GP tracks to members (future enhancement)
- **Assignment history/versioning**: No audit trail of assignment changes
- **Assignment templates**: No ability to copy assignments between songs
- **Notification system**: No alerts when assignments change

## 5. Requirements

### 5.1 Functional Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-1 | Create assignment for a section | User can select a member, role, and status (playing/resting/optional) and save; assignment appears in section card |
| FR-2 | Edit existing assignment | User can modify role, status, or notes of an existing assignment; changes persist after page refresh |
| FR-3 | Delete assignment | User can remove an assignment; confirmation dialog shown; section card updates immediately |
| FR-4 | View assignments per section | SectionCard displays list of assignments with member name, role, and status indicator |
| FR-5 | Status indicators | Playing shows filled circle (●), Optional shows half-filled (◐), Resting shows empty circle (○) |
| FR-6 | Section-specific notes | Each assignment can have optional notes (max 500 chars); displayed in assignment list and editable in form |
| FR-7 | Your Assignment display | Logged-in user sees their assignment highlighted in each section; shows role, status, and any notes |
| FR-8 | Assignment status summary | Each SectionCard header shows member status summary in format "3 Playing, 1 Resting"; clicking summary does not filter (display only) |

### 5.2 Technical Requirements

- **Database**: New `section_assignments` table with foreign keys to `song_sections` and `band_members`
- **RLS Policies**: Users can only view/modify assignments for sections in their band
- **Service Layer**: New service methods in `supabaseStorageService.ts`
- **Types**: New `SectionAssignment` interface in `types.ts`
- **Components**: New assignment components in `src/components/structure/`
- **Notes validation**: Maximum 500 characters enforced at database level via CHECK constraint

## 6. Implementation Approach

### 6.1 Database Schema

```sql
-- Migration: 026_add_section_assignments.sql

-- Section assignments (who plays what per section)
CREATE TABLE section_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES song_sections(id) ON DELETE CASCADE,
  member_id UUID REFERENCES band_members(id) ON DELETE SET NULL,
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,

  role TEXT NOT NULL,              -- "Lead Guitar", "Rhythm Guitar", "Bass", etc.
  status TEXT DEFAULT 'playing' CHECK (status IN ('playing', 'resting', 'optional')),
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),  -- Section-specific notes with max length

  gp_track_index INTEGER,          -- Link to GP track (future use)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate member+role assignments per section
  UNIQUE(section_id, member_id, role)
);

-- Indexes for common queries
CREATE INDEX idx_assignments_section ON section_assignments(section_id);
CREATE INDEX idx_assignments_member ON section_assignments(member_id);
CREATE INDEX idx_assignments_band ON section_assignments(band_id);

-- RLS Policies
ALTER TABLE section_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments in their bands
CREATE POLICY "Users can view band section assignments"
  ON section_assignments FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can insert assignments in their bands
CREATE POLICY "Users can create band section assignments"
  ON section_assignments FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can update assignments in their bands
CREATE POLICY "Users can update band section assignments"
  ON section_assignments FOR UPDATE
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );

-- Users can delete assignments in their bands
CREATE POLICY "Users can delete band section assignments"
  ON section_assignments FOR DELETE
  USING (
    band_id IN (
      SELECT band_id FROM user_bands WHERE user_id = auth.uid()
    )
  );
```

### 6.2 TypeScript Types

Add to `src/types.ts`:

```typescript
// =============================================================================
// SECTION ASSIGNMENTS (Phase 2 - Song Collaboration Architecture)
// =============================================================================

/** Assignment status indicating member activity in a section */
export type AssignmentStatus = 'playing' | 'resting' | 'optional';

/** Section assignment representing a member's role in a specific section */
export interface SectionAssignment {
  id: string;
  sectionId: string;
  memberId: string | null;  // null if member was deleted
  bandId: string;
  role: string;
  status: AssignmentStatus;
  notes?: string;           // Max 500 chars (enforced by DB)
  gpTrackIndex?: number;

  // Denormalized for display (populated by joins)
  memberName?: string;
  memberAvatarColor?: string;

  createdAt: string;
  updatedAt: string;
}

/** Input type for creating/updating assignments */
export interface SectionAssignmentInput {
  sectionId: string;
  memberId: string;
  bandId: string;
  role: string;
  status: AssignmentStatus;
  notes?: string;
  gpTrackIndex?: number;
}

/** Summary of assignment statuses for a section (used in SectionCard header) */
export interface AssignmentStatusSummary {
  playing: number;
  resting: number;
  optional: number;
  total: number;
}
```

### 6.3 Service Layer Methods

Add to `SupabaseStorageService` class in `src/services/supabaseStorageService.ts`:

```typescript
// =============================================================================
// SECTION ASSIGNMENTS (Phase 2 - Song Collaboration Architecture)
// =============================================================================

/**
 * Transform database row to SectionAssignment type
 */
private transformSectionAssignment(
  row: Database['public']['Tables']['section_assignments']['Row'],
  memberData?: { name: string; avatar_color: string | null }
): SectionAssignment {
  return {
    id: row.id,
    sectionId: row.section_id,
    memberId: row.member_id,
    bandId: row.band_id,
    role: row.role,
    status: row.status as AssignmentStatus,
    notes: row.notes ?? undefined,
    gpTrackIndex: row.gp_track_index ?? undefined,
    memberName: memberData?.name,
    memberAvatarColor: memberData?.avatar_color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all assignments for a song's sections.
 * Uses a two-query approach for reliable filtering:
 * 1. Fetch section IDs for the song
 * 2. Fetch assignments for those sections with member data
 */
async getSongSectionAssignments(songId: string): Promise<SectionAssignment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!this.currentBandId) {
    throw new Error('No band selected. Call setCurrentBand() first.');
  }

  try {
    // Step 1: Get section IDs for this song
    const { data: sections, error: sectionsError } = await supabase
      .from('song_sections')
      .select('id')
      .eq('song_id', songId)
      .eq('band_id', this.currentBandId);

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      throw new Error('Failed to load sections');
    }

    const sectionIds = sections?.map(s => s.id) || [];
    if (sectionIds.length === 0) {
      return [];
    }

    // Step 2: Fetch assignments for those sections with member join
    const { data, error } = await supabase
      .from('section_assignments')
      .select(`
        *,
        band_members!member_id (
          name,
          avatar_color
        )
      `)
      .in('section_id', sectionIds)
      .eq('band_id', this.currentBandId);

    if (error) {
      console.error('Error fetching section assignments:', error);
      throw new Error('Failed to load section assignments');
    }

    return (data || []).map(row => {
      const memberData = row.band_members as { name: string; avatar_color: string | null } | null;
      return this.transformSectionAssignment(row, memberData ?? undefined);
    });
  } catch (error) {
    console.error('Error in getSongSectionAssignments:', error);
    throw error instanceof Error ? error : new Error('Failed to load section assignments');
  }
}

/**
 * Get assignments for a specific section
 */
async getSectionAssignments(sectionId: string): Promise<SectionAssignment[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!this.currentBandId) {
    throw new Error('No band selected. Call setCurrentBand() first.');
  }

  try {
    const { data, error } = await supabase
      .from('section_assignments')
      .select(`
        *,
        band_members!member_id (
          name,
          avatar_color
        )
      `)
      .eq('section_id', sectionId)
      .eq('band_id', this.currentBandId);

    if (error) {
      console.error('Error fetching section assignments:', error);
      throw new Error('Failed to load section assignments');
    }

    return (data || []).map(row => {
      const memberData = row.band_members as { name: string; avatar_color: string | null } | null;
      return this.transformSectionAssignment(row, memberData ?? undefined);
    });
  } catch (error) {
    console.error('Error in getSectionAssignments:', error);
    throw error instanceof Error ? error : new Error('Failed to load section assignments');
  }
}

/**
 * Create a new section assignment
 */
async createSectionAssignment(input: SectionAssignmentInput): Promise<SectionAssignment> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!this.currentBandId) {
    throw new Error('No band selected. Call setCurrentBand() first.');
  }

  // Validate notes length
  if (input.notes && input.notes.length > 500) {
    throw new Error('Notes cannot exceed 500 characters');
  }

  try {
    const { data, error } = await supabase
      .from('section_assignments')
      .insert({
        section_id: input.sectionId,
        member_id: input.memberId,
        band_id: input.bandId,
        role: input.role,
        status: input.status,
        notes: input.notes ?? null,
        gp_track_index: input.gpTrackIndex ?? null,
      })
      .select(`
        *,
        band_members!member_id (
          name,
          avatar_color
        )
      `)
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('This member is already assigned to this role in this section');
      }
      console.error('Error creating section assignment:', error);
      throw new Error('Failed to create assignment');
    }

    const memberData = data.band_members as { name: string; avatar_color: string | null } | null;
    return this.transformSectionAssignment(data, memberData ?? undefined);
  } catch (error) {
    console.error('Error in createSectionAssignment:', error);
    throw error instanceof Error ? error : new Error('Failed to create assignment');
  }
}

/**
 * Update an existing section assignment
 */
async updateSectionAssignment(
  assignmentId: string,
  updates: Partial<Omit<SectionAssignmentInput, 'sectionId' | 'bandId'>>
): Promise<SectionAssignment> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!this.currentBandId) {
    throw new Error('No band selected. Call setCurrentBand() first.');
  }

  // Validate notes length
  if (updates.notes && updates.notes.length > 500) {
    throw new Error('Notes cannot exceed 500 characters');
  }

  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if ('memberId' in updates) updatePayload.member_id = updates.memberId;
    if ('role' in updates) updatePayload.role = updates.role;
    if ('status' in updates) updatePayload.status = updates.status;
    if ('notes' in updates) updatePayload.notes = updates.notes ?? null;
    if ('gpTrackIndex' in updates) updatePayload.gp_track_index = updates.gpTrackIndex ?? null;

    const { data, error } = await supabase
      .from('section_assignments')
      .update(updatePayload)
      .eq('id', assignmentId)
      .eq('band_id', this.currentBandId)
      .select(`
        *,
        band_members!member_id (
          name,
          avatar_color
        )
      `)
      .single();

    if (error) {
      console.error('Error updating section assignment:', error);
      throw new Error('Failed to update assignment');
    }

    if (!data) {
      throw new Error('Assignment not found');
    }

    const memberData = data.band_members as { name: string; avatar_color: string | null } | null;
    return this.transformSectionAssignment(data, memberData ?? undefined);
  } catch (error) {
    console.error('Error in updateSectionAssignment:', error);
    throw error instanceof Error ? error : new Error('Failed to update assignment');
  }
}

/**
 * Delete a section assignment
 */
async deleteSectionAssignment(assignmentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!this.currentBandId) {
    throw new Error('No band selected. Call setCurrentBand() first.');
  }

  try {
    const { data, error } = await supabase
      .from('section_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('band_id', this.currentBandId)
      .select();

    if (error) {
      console.error('Error deleting section assignment:', error);
      throw new Error('Failed to delete assignment');
    }

    if (!data || data.length === 0) {
      throw new Error('Assignment not found');
    }
  } catch (error) {
    console.error('Error in deleteSectionAssignment:', error);
    throw error instanceof Error ? error : new Error('Failed to delete assignment');
  }
}
```

### 6.4 React Hook

Create `src/hooks/useSectionAssignments.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabaseStorageService } from '@/services/supabaseStorageService';
import type { SectionAssignment, SectionAssignmentInput, AssignmentStatusSummary } from '@/types';

interface UseSectionAssignmentsResult {
  /** All assignments for the song, keyed by section ID */
  assignmentsBySection: Map<string, SectionAssignment[]>;
  /** All assignments as a flat array */
  allAssignments: SectionAssignment[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Create a new assignment */
  createAssignment: (input: SectionAssignmentInput) => Promise<SectionAssignment>;
  /** Update an existing assignment */
  updateAssignment: (id: string, updates: Partial<Omit<SectionAssignmentInput, 'sectionId' | 'bandId'>>) => Promise<SectionAssignment>;
  /** Delete an assignment */
  deleteAssignment: (id: string) => Promise<void>;
  /** Get assignments for a specific section */
  getAssignmentsForSection: (sectionId: string) => SectionAssignment[];
  /** Get status summary for a section (for SectionCard header display) */
  getStatusSummary: (sectionId: string) => AssignmentStatusSummary;
  /** Get current user's assignment for a section (if any) */
  getUserAssignmentForSection: (sectionId: string, userId: string, members: Array<{ id: string; userId?: string | null }>) => SectionAssignment | undefined;
  /** Refetch all assignments */
  refetch: () => Promise<void>;
}

export function useSectionAssignments(songId: string | undefined, bandId: string | null): UseSectionAssignmentsResult {
  const [allAssignments, setAllAssignments] = useState<SectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Group assignments by section ID
  const assignmentsBySection = new Map<string, SectionAssignment[]>();
  allAssignments.forEach(assignment => {
    const existing = assignmentsBySection.get(assignment.sectionId) || [];
    assignmentsBySection.set(assignment.sectionId, [...existing, assignment]);
  });

  const fetchAssignments = useCallback(async () => {
    if (!songId || !bandId) {
      setAllAssignments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const assignments = await supabaseStorageService.getSongSectionAssignments(songId);
      setAllAssignments(assignments);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load assignments');
      setError(error);
      console.error('Error fetching section assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [songId, bandId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = useCallback(async (input: SectionAssignmentInput): Promise<SectionAssignment> => {
    const newAssignment = await supabaseStorageService.createSectionAssignment(input);
    setAllAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  const updateAssignment = useCallback(async (
    id: string,
    updates: Partial<Omit<SectionAssignmentInput, 'sectionId' | 'bandId'>>
  ): Promise<SectionAssignment> => {
    const updated = await supabaseStorageService.updateSectionAssignment(id, updates);
    setAllAssignments(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteAssignment = useCallback(async (id: string): Promise<void> => {
    await supabaseStorageService.deleteSectionAssignment(id);
    setAllAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAssignmentsForSection = useCallback((sectionId: string): SectionAssignment[] => {
    return assignmentsBySection.get(sectionId) || [];
  }, [assignmentsBySection]);

  const getStatusSummary = useCallback((sectionId: string): AssignmentStatusSummary => {
    const sectionAssignments = assignmentsBySection.get(sectionId) || [];
    return {
      playing: sectionAssignments.filter(a => a.status === 'playing').length,
      resting: sectionAssignments.filter(a => a.status === 'resting').length,
      optional: sectionAssignments.filter(a => a.status === 'optional').length,
      total: sectionAssignments.length,
    };
  }, [assignmentsBySection]);

  const getUserAssignmentForSection = useCallback((
    sectionId: string,
    userId: string,
    members: Array<{ id: string; userId?: string | null }>
  ): SectionAssignment | undefined => {
    // Find the member linked to this user
    const userMember = members.find(m => m.userId === userId);
    if (!userMember) return undefined;

    const sectionAssignments = assignmentsBySection.get(sectionId) || [];
    return sectionAssignments.find(a => a.memberId === userMember.id);
  }, [assignmentsBySection]);

  return {
    assignmentsBySection,
    allAssignments,
    isLoading,
    error,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentsForSection,
    getStatusSummary,
    getUserAssignmentForSection,
    refetch: fetchAssignments,
  };
}
```

### 6.5 Component Architecture

```
src/components/structure/
  index.ts                    # Update barrel export
  StructureTab.tsx            # Pass members prop to SectionList
  SectionList.tsx             # Pass members to SectionCard
  SectionCard.tsx             # Add assignments display + assign button
  SectionForm.tsx             # (existing)
  AssignmentList.tsx          # Create - displays assignments with activity indicators
  AssignmentForm.tsx          # Create - add/edit assignment dialog
  ActivityIndicator.tsx       # Create - ● ◐ ○ status icons
  YourAssignment.tsx          # Create - current user's assignment display
```

### 6.6 ActivityIndicator Component

Create `src/components/structure/ActivityIndicator.tsx`:

```typescript
import React, { memo } from 'react';
import type { AssignmentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityIndicatorProps {
  status: AssignmentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Visual indicator for assignment status.
 * Uses semantic color tokens defined in src/index.css:
 * - text-success: defined at line 145 (@theme inline) maps to --color-success
 * - text-warning: defined at line 147 (@theme inline) maps to --color-warning
 * - text-muted-foreground: standard shadcn/ui token
 *
 * Status indicators:
 * - Playing: filled circle (●) in success green
 * - Optional: half-filled circle (◐) in warning amber
 * - Resting: empty circle (○) in muted gray
 */
export const ActivityIndicator: React.FC<ActivityIndicatorProps> = memo(function ActivityIndicator({
  status,
  size = 'md',
  showLabel = false,
}) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const config = {
    playing: {
      symbol: '●',
      colorClass: 'text-success',  // Defined in src/index.css @theme inline
      label: 'Playing',
    },
    optional: {
      symbol: '◐',
      colorClass: 'text-warning',  // Defined in src/index.css @theme inline
      label: 'Optional',
    },
    resting: {
      symbol: '○',
      colorClass: 'text-muted-foreground',
      label: 'Resting',
    },
  };

  const { symbol, colorClass, label } = config[status];

  return (
    <span
      className={cn('inline-flex items-center gap-1', sizeClasses[size])}
      title={label}
      aria-label={label}
    >
      <span className={colorClass} aria-hidden="true">
        {symbol}
      </span>
      {showLabel && <span className="text-muted-foreground">{label}</span>}
    </span>
  );
});

ActivityIndicator.displayName = 'ActivityIndicator';
```

### 6.7 AssignmentList Component

Create `src/components/structure/AssignmentList.tsx`:

```typescript
import React, { memo } from 'react';
import { User, Music2 } from 'lucide-react';
import type { SectionAssignment } from '@/types';
import { ActivityIndicator } from './ActivityIndicator';
import { cn } from '@/lib/utils';

interface AssignmentListProps {
  /** Assignments to display */
  assignments: SectionAssignment[];
  /** Current user's member ID (for highlighting) */
  currentUserMemberId?: string;
  /** Callback when assignment is clicked for editing */
  onEdit?: (assignment: SectionAssignment) => void;
  /** Callback when delete is requested */
  onDelete?: (assignment: SectionAssignment) => void;
  /** Whether edit/delete actions are available */
  editable?: boolean;
  /** Compact display mode (less padding, smaller text) */
  compact?: boolean;
}

/**
 * Displays a list of member assignments for a section.
 * Highlights the current user's assignment and shows status indicators.
 */
export const AssignmentList: React.FC<AssignmentListProps> = memo(function AssignmentList({
  assignments,
  currentUserMemberId,
  onEdit,
  onDelete,
  editable = false,
  compact = false,
}) {
  if (assignments.length === 0) {
    return (
      <div className={cn(
        'text-muted-foreground italic',
        compact ? 'text-xs' : 'text-sm'
      )}>
        No assignments yet
      </div>
    );
  }

  return (
    <ul className={cn('space-y-1', compact ? 'text-xs' : 'text-sm')}>
      {assignments.map(assignment => {
        const isCurrentUser = assignment.memberId === currentUserMemberId;

        return (
          <li
            key={assignment.id}
            className={cn(
              'flex items-center gap-2 rounded px-2 py-1',
              isCurrentUser && 'bg-primary/10 border border-primary/20',
              editable && 'cursor-pointer hover:bg-muted/50',
            )}
            onClick={editable && onEdit ? () => onEdit(assignment) : undefined}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={editable && onEdit ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(assignment);
              }
            } : undefined}
          >
            {/* Status indicator */}
            <ActivityIndicator status={assignment.status} size={compact ? 'sm' : 'md'} />

            {/* Member name with avatar color */}
            <span className="flex items-center gap-1 min-w-0">
              <User size={compact ? 12 : 14} className="shrink-0 text-muted-foreground" />
              <span className={cn(
                'truncate',
                isCurrentUser && 'font-medium text-primary'
              )}>
                {assignment.memberName || 'Unknown'}
              </span>
            </span>

            {/* Role */}
            <span className="text-muted-foreground flex items-center gap-1 shrink-0">
              <Music2 size={compact ? 10 : 12} />
              {assignment.role}
            </span>

            {/* Notes indicator */}
            {assignment.notes && (
              <span
                className="text-muted-foreground/60 truncate max-w-[100px]"
                title={assignment.notes}
              >
                - {assignment.notes}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
});

AssignmentList.displayName = 'AssignmentList';
```

### 6.8 AssignmentForm Component

Create `src/components/structure/AssignmentForm.tsx`:

```typescript
import React, { useState, useCallback, useEffect, memo } from 'react';
import type { SectionAssignment, SectionAssignmentInput, AssignmentStatus, BandMember } from '@/types';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Textarea } from '@/components/primitives/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/primitives/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { toast } from '@/components/ui';
import { Instrument } from '@/types';
import { cn } from '@/lib/utils';

interface AssignmentFormProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler - receives input for create or updates for edit */
  onSubmit: (data: AssignmentFormData) => Promise<void>;
  /** Existing assignment for editing, or null for creating new */
  assignment: SectionAssignment | null;
  /** Section ID (required for creating new assignments) */
  sectionId: string;
  /** Band ID (required for creating new assignments) */
  bandId: string;
  /** Section name for display */
  sectionName: string;
  /** Available band members */
  members: BandMember[];
  /** Existing assignments in this section (to prevent duplicates) */
  existingAssignments: SectionAssignment[];
}

export interface AssignmentFormData {
  memberId: string;
  role: string;
  status: AssignmentStatus;
  notes?: string;
}

const STATUS_OPTIONS: { value: AssignmentStatus; label: string; description: string }[] = [
  { value: 'playing', label: 'Playing', description: 'Actively playing in this section' },
  { value: 'resting', label: 'Resting', description: 'Not playing in this section' },
  { value: 'optional', label: 'Optional', description: 'Can play or rest as needed' },
];

const ROLE_OPTIONS = Object.values(Instrument);

const MAX_NOTES_LENGTH = 500;

/**
 * Dialog form for creating or editing a section assignment.
 * Validates member/role uniqueness and notes length.
 */
export const AssignmentForm: React.FC<AssignmentFormProps> = memo(function AssignmentForm({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  sectionId,
  bandId,
  sectionName,
  members,
  existingAssignments,
}) {
  const isEditing = assignment !== null;

  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('playing');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ member?: string; role?: string; notes?: string }>({});

  // Initialize form when assignment changes
  useEffect(() => {
    if (assignment) {
      setMemberId(assignment.memberId || '');
      setRole(assignment.role);
      setStatus(assignment.status);
      setNotes(assignment.notes || '');
    } else {
      setMemberId('');
      setRole('');
      setStatus('playing');
      setNotes('');
    }
    setErrors({});
  }, [assignment, isOpen]);

  const validate = useCallback((): boolean => {
    const newErrors: { member?: string; role?: string; notes?: string } = {};

    if (!memberId) {
      newErrors.member = 'Please select a member';
    }

    if (!role.trim()) {
      newErrors.role = 'Please select or enter a role';
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      newErrors.notes = `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`;
    }

    // Check for duplicate member+role (excluding current assignment if editing)
    const isDuplicate = existingAssignments.some(
      a => a.id !== assignment?.id && a.memberId === memberId && a.role === role.trim()
    );
    if (isDuplicate) {
      newErrors.role = 'This member is already assigned to this role in this section';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [memberId, role, notes, existingAssignments, assignment?.id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit({
          memberId,
          role: role.trim(),
          status,
          notes: notes.trim() || undefined,
        });
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save assignment'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, memberId, role, status, notes, onSubmit, onClose]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const notesRemaining = MAX_NOTES_LENGTH - notes.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the assignment in "${sectionName}"`
              : `Assign a member to "${sectionName}"`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Select */}
          <div className="space-y-2">
            <Label htmlFor="assignment-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="assignment-member">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.member && (
              <p className="text-sm text-destructive">{errors.member}</p>
            )}
          </div>

          {/* Role Select/Input */}
          <div className="space-y-2">
            <Label htmlFor="assignment-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="assignment-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(roleOption => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Allow custom role entry */}
            <Input
              placeholder="Or enter custom role..."
              value={ROLE_OPTIONS.includes(role as Instrument) ? '' : role}
              onChange={e => setRole(e.target.value)}
              className="mt-2"
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          {/* Status Select */}
          <div className="space-y-2">
            <Label htmlFor="assignment-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AssignmentStatus)}>
              <SelectTrigger id="assignment-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.label}
                      <span className="text-xs text-muted-foreground">- {opt.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="assignment-notes">Notes (optional)</Label>
              <span className={cn(
                'text-xs',
                notesRemaining < 50 ? 'text-warning' : 'text-muted-foreground'
              )}>
                {notesRemaining} remaining
              </span>
            </div>
            <Textarea
              id="assignment-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Use capo on 3rd fret, palm muting in verse..."
              rows={3}
              maxLength={MAX_NOTES_LENGTH}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

AssignmentForm.displayName = 'AssignmentForm';
```

### 6.9 YourAssignment Component

Create `src/components/structure/YourAssignment.tsx`:

```typescript
import React, { memo } from 'react';
import { User, Music2, AlertCircle } from 'lucide-react';
import type { SectionAssignment } from '@/types';
import { ActivityIndicator } from './ActivityIndicator';
import { cn } from '@/lib/utils';

interface YourAssignmentProps {
  /** The current user's assignment for a section, or undefined if not assigned */
  assignment?: SectionAssignment;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Displays the current logged-in user's assignment for a section.
 * Shows role, status, and any section-specific notes.
 */
export const YourAssignment: React.FC<YourAssignmentProps> = memo(function YourAssignment({
  assignment,
  compact = false,
}) {
  if (!assignment) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-muted-foreground',
        compact ? 'text-xs' : 'text-sm'
      )}>
        <AlertCircle size={compact ? 12 : 14} />
        <span>No assignment for you in this section</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border border-primary/20 bg-primary/5 p-3',
      compact && 'p-2'
    )}>
      <div className={cn(
        'flex items-center gap-3',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {/* Status indicator */}
        <ActivityIndicator status={assignment.status} size={compact ? 'sm' : 'md'} />

        {/* Role */}
        <span className="flex items-center gap-1 font-medium text-primary">
          <Music2 size={compact ? 12 : 14} />
          {assignment.role}
        </span>

        {/* Status label */}
        <span className="text-muted-foreground capitalize">
          ({assignment.status})
        </span>
      </div>

      {/* Notes */}
      {assignment.notes && (
        <p className={cn(
          'mt-2 text-muted-foreground italic border-l-2 border-primary/30 pl-2',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {assignment.notes}
        </p>
      )}
    </div>
  );
});

YourAssignment.displayName = 'YourAssignment';
```

### 6.10 SectionCard Integration

Update `src/components/structure/SectionCard.tsx` to include assignment display:

```typescript
// Add to imports
import { AssignmentList } from './AssignmentList';
import { ActivityIndicator } from './ActivityIndicator';
import type { SectionAssignment, AssignmentStatusSummary, BandMember } from '@/types';
import { UserPlus } from 'lucide-react';

// Add to props interface
interface SectionCardProps {
  section: SongSection;
  assignments: SectionAssignment[];
  statusSummary: AssignmentStatusSummary;
  currentUserMemberId?: string;
  members: BandMember[];
  onEdit: (section: SongSection) => void;
  onDelete: (section: SongSection) => void;
  onEditAssignment?: (assignment: SectionAssignment) => void;
  onDeleteAssignment?: (assignment: SectionAssignment) => void;
  onAddAssignment?: (sectionId: string) => void;
}

// In render, add status summary to header (after section name badge):
{statusSummary.total > 0 && (
  <span className="text-xs text-muted-foreground ml-2">
    {statusSummary.playing > 0 && `${statusSummary.playing} Playing`}
    {statusSummary.playing > 0 && statusSummary.resting > 0 && ', '}
    {statusSummary.resting > 0 && `${statusSummary.resting} Resting`}
  </span>
)}

// Add assignments section below bar range:
{assignments.length > 0 && (
  <div className="mt-3 pt-3 border-t border-border">
    <AssignmentList
      assignments={assignments}
      currentUserMemberId={currentUserMemberId}
      onEdit={onEditAssignment}
      compact
    />
  </div>
)}

// Add "Assign" button to action buttons
<Button
  variant="ghost"
  size="icon"
  onClick={() => onAddAssignment?.(section.id)}
  className="h-8 w-8 text-muted-foreground hover:text-foreground"
  aria-label={`Add assignment to ${section.name}`}
>
  <UserPlus size={14} />
</Button>
```

## 7. Edge Cases and Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Member deleted while assigned | Assignment remains with `member_id = NULL`; UI shows "Unknown" for member name |
| Section deleted | All assignments for that section are cascade-deleted |
| Duplicate member+role in same section | Database unique constraint prevents; UI shows error toast |
| Notes exceed 500 characters | Database CHECK constraint rejects; service layer validates before insert; UI shows character counter and prevents submission |
| User not linked to any member | "Your Assignment" shows "No assignment" message |
| Network error on save | Toast error with retry option; form remains open |
| Concurrent edit conflict | Last write wins (no optimistic locking); consider adding `updated_at` check in future |
| Empty section (no assignments) | AssignmentList shows "No assignments yet" placeholder |

## 8. Testing Strategy

### Unit Tests

- `useSectionAssignments` hook: state management, filtering, grouping
- `ActivityIndicator`: renders correct symbol and color for each status
- `AssignmentForm`: validation (empty fields, duplicate member+role, notes length)
- `AssignmentList`: renders assignments, highlights current user

### Integration Tests

- Create assignment flow: open form -> fill fields -> submit -> verify appears in list
- Edit assignment flow: click assignment -> modify -> save -> verify changes persist
- Delete assignment flow: click delete -> confirm -> verify removed
- User assignment display: log in as member -> verify "Your Assignment" shows correct data

### Manual Validation

- [ ] Verify status summary in SectionCard header updates correctly
- [ ] Test on mobile: ensure touch targets are adequate (44px minimum)
- [ ] Verify assignments persist across page refresh
- [ ] Test with deleted member: ensure graceful degradation

## 9. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/026_add_section_assignments.sql` | Create | Database migration for section_assignments table with CHECK constraint |
| `src/types.ts` | Modify | Add SectionAssignment, AssignmentStatus, AssignmentStatusSummary types |
| `src/types/database.types.ts` | Modify | Regenerate with new table types |
| `src/services/supabaseStorageService.ts` | Modify | Add CRUD methods for section assignments |
| `src/hooks/useSectionAssignments.ts` | Create | React hook for assignment state management |
| `src/components/structure/ActivityIndicator.tsx` | Create | Status indicator component (●/◐/○) |
| `src/components/structure/AssignmentList.tsx` | Create | Display list of assignments with member highlighting |
| `src/components/structure/AssignmentForm.tsx` | Create | Dialog form for creating/editing assignments |
| `src/components/structure/YourAssignment.tsx` | Create | Current user's assignment display |
| `src/components/structure/SectionCard.tsx` | Modify | Integrate assignments display and status summary |
| `src/components/structure/StructureTab.tsx` | Modify | Wire up assignment CRUD handlers |
| `src/components/structure/index.ts` | Modify | Export new components |

## 10. Open Questions

None - all requirements are clear.

The following decisions have been made based on codebase research:
- **Color tokens**: `text-success` and `text-warning` are properly defined in `src/index.css` via the `@theme inline` block (lines 145-148) and are used consistently throughout the codebase (verified in StatCard.tsx, badge.tsx, and 25+ other locations)
- **Notes length**: 500 character limit enforced at database level via CHECK constraint
- **Query pattern**: Two-query approach for `getSongSectionAssignments` avoids unreliable nested relation filtering in PostgREST

---

## Related Documents

- Architecture: `specs/backlog/feat-song-collaboration-architecture.md`
- Phase 1 Spec: `specs/feat-phase1-song-sections.md`
- GitHub Issue: #196
