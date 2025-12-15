import React, { useState, useCallback, useEffect, memo } from 'react';
import type { SectionAssignment, AssignmentStatus, BandMember } from '@/types';
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
  /** Optional callback for deleting an assignment */
  onDelete?: (assignment: SectionAssignment) => void;
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
  onDelete,
}) {
  // Note: sectionId and bandId are passed for context but not used in the form itself
  // They are used by the parent component when constructing the assignment input
  void sectionId;
  void bandId;

  const isEditing = assignment !== null;

  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [status, setStatus] = useState<AssignmentStatus>('playing');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ member?: string; role?: string; notes?: string }>({});

  // Initialize form when assignment changes
  useEffect(() => {
    if (assignment) {
      setMemberId(assignment.memberId || '');
      // Check if role is a standard role or custom
      const isStandardRole = ROLE_OPTIONS.includes(assignment.role as Instrument);
      setRole(isStandardRole ? assignment.role : '');
      setCustomRole(isStandardRole ? '' : assignment.role);
      setStatus(assignment.status);
      setNotes(assignment.notes || '');
    } else {
      setMemberId('');
      setRole('');
      setCustomRole('');
      setStatus('playing');
      setNotes('');
    }
    setErrors({});
  }, [assignment, isOpen]);

  // Get the effective role (either from select or custom input)
  const effectiveRole = customRole.trim() || role;

  const validate = useCallback((): boolean => {
    const newErrors: { member?: string; role?: string; notes?: string } = {};

    if (!memberId) {
      newErrors.member = 'Please select a member';
    }

    if (!effectiveRole) {
      newErrors.role = 'Please select or enter a role';
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      newErrors.notes = `Notes cannot exceed ${MAX_NOTES_LENGTH} characters`;
    }

    // Check for duplicate member+role (excluding current assignment if editing)
    const isDuplicate = existingAssignments.some(
      a => a.id !== assignment?.id && a.memberId === memberId && a.role === effectiveRole
    );
    if (isDuplicate) {
      newErrors.role = 'This member is already assigned to this role in this section';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [memberId, effectiveRole, notes, existingAssignments, assignment?.id]);

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
          role: effectiveRole,
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
    [validate, memberId, effectiveRole, status, notes, onSubmit, onClose]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  const handleDelete = useCallback(() => {
    if (assignment && onDelete) {
      onDelete(assignment);
    }
  }, [assignment, onDelete]);

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
            <Select value={role} onValueChange={(v) => { setRole(v); setCustomRole(''); }}>
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
              value={customRole}
              onChange={e => { setCustomRole(e.target.value); if (e.target.value) setRole(''); }}
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="sm:mr-auto"
              >
                Delete
              </Button>
            )}
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
