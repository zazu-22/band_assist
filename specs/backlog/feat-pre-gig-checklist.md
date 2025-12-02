# Feature: Pre-Gig Checklist

| Field | Value |
| ----- | ----- |
| **Status** | Backlog |
| **Priority** | Medium |
| **Type** | Feature |
| **Created** | 2025-12-02 |

---

## Summary

Customizable checklists for gig preparation linked to gig events, including per-member gear lists and task assignments. Includes 3-day reminder notifications and completion tracking to ensure the band is fully prepared before each performance.

## Problem

- No structured way to track gig preparation tasks
- Band members forget gear or responsibilities before gigs
- Generic to-do lists don't capture gig-specific requirements
- No reminders for pre-gig preparation
- Gear lists are maintained separately (notes, messages) and easily lost
- Cannot track which members have completed their prep tasks

## Proposed Solution

Add a gig checklist system tied to `BandEvent` records where `type='GIG'`:

**Database Schema:**
- `gig_checklists` table:
  - `id` (uuid, primary key)
  - `gig_event_id` (uuid, foreign key to band_events)
  - `band_id` (uuid, foreign key to bands)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- `checklist_items` table:
  - `id` (uuid, primary key)
  - `checklist_id` (uuid, foreign key to gig_checklists)
  - `task_name` (text)
  - `assigned_to_member_id` (uuid, nullable, foreign key to band_members)
  - `is_completed` (boolean, default false)
  - `completed_by` (uuid, nullable, foreign key to user_bands.user_id)
  - `completed_at` (timestamp, nullable)
  - `item_type` (text) - 'GEAR' | 'TASK' | 'REMINDER'
  - `sort_order` (integer)
  - `created_at` (timestamp)

- `checklist_templates` table (optional):
  - `id` (uuid, primary key)
  - `band_id` (uuid, foreign key to bands)
  - `template_name` (text)
  - `items` (jsonb) - Array of template item definitions
  - `created_at` (timestamp)

**UI Components:**
- `GigChecklistPanel` - Shows checklist for gig in ScheduleManager or gig detail view
- `ChecklistEditor` - Add/remove/reorder checklist items
- `ChecklistTemplateManager` - Create reusable templates
- Checkbox UI for marking items complete
- Visual progress indicator (e.g., "8/12 items complete")

**Notification System:**
- 3-day reminder: Check for upcoming gigs daily, send notification
- Could use Supabase Edge Functions with cron trigger
- In-app notification banner when gig is within 3 days and checklist incomplete

**Features:**
- Auto-create default checklist when new gig is created (from template or default items)
- Per-member gear lists with assignment
- Mark items complete with timestamp and user attribution
- Filter view by assigned member
- Export/print checklist

## Files Likely Affected

- `src/types.ts` - Add `GigChecklist`, `ChecklistItem`, `ChecklistTemplate` interfaces
- `src/types/database.types.ts` - Add new tables (generated)
- `src/components/ScheduleManager.tsx` - Integrate checklist panel for gig events
- `src/components/checklist/GigChecklistPanel.tsx` - New component
- `src/components/checklist/ChecklistEditor.tsx` - New component
- `src/components/checklist/ChecklistTemplateManager.tsx` - New component
- `src/components/Dashboard.tsx` - Show upcoming gig checklist warnings
- `src/services/supabaseStorageService.ts` - CRUD operations for checklists
- `src/lib/notifications.ts` - Add checklist reminder logic (new file)
- `supabase/migrations/` - New migrations for checklist tables
- `supabase/functions/gig-reminders/` - Edge function for 3-day reminders (optional)

## Acceptance Criteria

- [ ] Database tables created with proper relationships and RLS policies
- [ ] Gig events can have associated checklists
- [ ] Users can add/edit/delete checklist items
- [ ] Items can be assigned to specific band members
- [ ] Users can mark items as complete (with timestamp tracking)
- [ ] Visual progress indicator shows completion percentage
- [ ] Templates can be created and applied to new gigs
- [ ] Default template auto-applies to new gigs (configurable)
- [ ] Filter checklist by assigned member
- [ ] Dashboard shows warning for incomplete checklists within 3 days of gig
- [ ] Mobile-friendly checklist interface
- [ ] Checklist items can be reordered (drag-and-drop or up/down buttons)
- [ ] Export checklist as text or PDF (optional)

## Dependencies

- `BandEvent` with type='GIG' exists
- Band members system working (for assignments)
- User authentication (for completed_by tracking)
- Multi-band support (for band_id scoping)
- (Optional) Supabase Edge Functions for automated reminders
