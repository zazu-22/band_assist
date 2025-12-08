import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from '@/components/primitives';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_BAND_NAME_LENGTH = 100;
const MIN_BAND_NAME_LENGTH = 1;

// Allow letters, numbers, spaces, and common punctuation for band names
// Disallow: < > { } [ ] \ | ^ ` and control characters
const BAND_NAME_PATTERN = /^[a-zA-Z0-9\s\-_'".!?&@#$%*()+=,;:/]+$/;

// =============================================================================
// TYPES
// =============================================================================

interface CreateBandDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bandName: string) => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CreateBandDialog: React.FC<CreateBandDialogProps> = memo(function CreateBandDialog({
  isOpen,
  onClose,
  onSubmit,
}) {
  // Ref for input focus management
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [bandName, setBandName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBandName('');
      setError(null);
    }
  }, [isOpen]);

  // Focus input when error occurs for better keyboard navigation
  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [error]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = bandName.trim();

      // Validation
      if (trimmedName.length < MIN_BAND_NAME_LENGTH) {
        setError('Band name is required');
        return;
      }

      if (trimmedName.length > MAX_BAND_NAME_LENGTH) {
        setError(`Band name cannot exceed ${MAX_BAND_NAME_LENGTH} characters`);
        return;
      }

      if (!BAND_NAME_PATTERN.test(trimmedName)) {
        setError('Band name contains invalid characters');
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        await onSubmit(trimmedName);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create band');
      } finally {
        setIsSubmitting(false);
      }
    },
    [bandName, onSubmit, onClose]
  );

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBandName(e.target.value);
    // Clear error when user starts typing
    setError(null);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create New Band</DialogTitle>
              <DialogDescription>
                You&apos;ll become the admin of this new band
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div
              id="band-name-error"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Band name */}
          <div className="space-y-2">
            <Label htmlFor="band-name">Band Name *</Label>
            <Input
              ref={inputRef}
              id="band-name"
              type="text"
              value={bandName}
              onChange={handleNameChange}
              placeholder="Enter band name"
              maxLength={MAX_BAND_NAME_LENGTH}
              autoFocus
              disabled={isSubmitting}
              aria-invalid={!!error}
              aria-describedby={error ? 'band-name-error' : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {bandName.length}/{MAX_BAND_NAME_LENGTH} characters
            </p>
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
            <Button type="submit" disabled={isSubmitting || !bandName.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Band'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CreateBandDialog.displayName = 'CreateBandDialog';
