import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Edit2,
  Check,
  X,
  Trash2,
  LogOut,
  Shield,
  ShieldCheck,
  Users,
  Loader2,
  Crown,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/primitives';
import { toast, ConfirmDialog, DangerousActionDialog } from '@/components/ui';
import { getSupabaseClient } from '@/services/supabaseClient';
import { cn } from '@/lib/utils';

/** Band member with role information from user_bands table */
interface BandMemberWithRole {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  isCurrentUser: boolean;
}

interface BandSettingsSectionProps {
  /** Current band ID */
  bandId: string;
  /** Current band name */
  bandName: string;
  /** Current user ID */
  currentUserId: string;
  /** Whether current user is admin */
  isAdmin: boolean;
  /** Callback when band name is updated */
  onBandNameUpdate: (newName: string) => void;
  /** Callback when user leaves the band */
  onLeaveBand: () => Promise<void>;
  /** Callback when band is deleted */
  onDeleteBand: () => Promise<void>;
}

/** Validation for band name */
function validateBandName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Band name cannot be empty' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Band name must be 50 characters or less' };
  }
  // Disallow certain characters that could cause issues
  const invalidChars = /[<>{}[\]\\|^`]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Band name contains invalid characters' };
  }
  return { isValid: true };
}

export const BandSettingsSection: React.FC<BandSettingsSectionProps> = memo(
  function BandSettingsSection({
    bandId,
    bandName,
    currentUserId,
    isAdmin,
    onBandNameUpdate,
    onLeaveBand,
    onDeleteBand,
  }) {
    // Band name editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(bandName);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    // Band members state
    const [members, setMembers] = useState<BandMemberWithRole[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);

    // Dialog states
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showTransferDialog, setShowTransferDialog] = useState(false);
    const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
    const [isLeavingBand, setIsLeavingBand] = useState(false);
    const [isDeletingBand, setIsDeletingBand] = useState(false);
    const [isTransferringAdmin, setIsTransferringAdmin] = useState(false);

    // Load band members
    const loadMembers = useCallback(async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      try {
        // Fetch user_bands - user emails are not accessible from client-side
        const { data, error } = await supabase
          .from('user_bands')
          .select('user_id, role, joined_at')
          .eq('band_id', bandId)
          .order('joined_at', { ascending: true });

        if (error) throw error;

        // Transform data
        const transformedMembers: BandMemberWithRole[] = (data || []).map((row) => ({
          userId: row.user_id,
          role: row.role as 'admin' | 'member',
          joinedAt: row.joined_at,
          isCurrentUser: row.user_id === currentUserId,
        }));

        setMembers(transformedMembers);
      } catch (err) {
        console.error('Error loading band members:', err);
        setMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    }, [bandId, currentUserId]);

    useEffect(() => {
      loadMembers();
    }, [loadMembers]);

    // Update editedName when bandName prop changes
    useEffect(() => {
      setEditedName(bandName);
    }, [bandName]);

    // Derived state
    const adminCount = members.filter(m => m.role === 'admin').length;
    const isOnlyAdmin = isAdmin && adminCount === 1;
    const otherMembers = members.filter(m => m.userId !== currentUserId);
    const nonAdminMembers = members.filter(m => m.role === 'member');

    // Handle start editing
    const handleStartEditing = useCallback(() => {
      setIsEditing(true);
      setEditedName(bandName);
      setNameError(null);
    }, [bandName]);

    // Handle cancel editing
    const handleCancelEditing = useCallback(() => {
      setIsEditing(false);
      setEditedName(bandName);
      setNameError(null);
    }, [bandName]);

    // Handle save band name
    const handleSaveName = useCallback(async () => {
      const validation = validateBandName(editedName);
      if (!validation.isValid) {
        setNameError(validation.error || 'Invalid band name');
        return;
      }

      const trimmedName = editedName.trim();
      if (trimmedName === bandName) {
        setIsEditing(false);
        return;
      }

      setIsUpdatingName(true);
      setNameError(null);

      const supabase = getSupabaseClient();
      if (!supabase) {
        setNameError('Supabase is not configured');
        setIsUpdatingName(false);
        return;
      }

      try {
        const { error } = await supabase
          .from('bands')
          .update({ name: trimmedName })
          .eq('id', bandId);

        if (error) throw error;

        onBandNameUpdate(trimmedName);
        setIsEditing(false);
        toast.success('Band name updated');
      } catch (err) {
        console.error('Error updating band name:', err);
        setNameError('Failed to update band name. Please try again.');
      } finally {
        setIsUpdatingName(false);
      }
    }, [editedName, bandName, bandId, onBandNameUpdate]);

    // Handle key press in input
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSaveName();
        } else if (e.key === 'Escape') {
          handleCancelEditing();
        }
      },
      [handleSaveName, handleCancelEditing]
    );

    // Handle leave band click
    const handleLeaveClick = useCallback(() => {
      if (isOnlyAdmin && otherMembers.length > 0) {
        // Must transfer admin first
        setShowTransferDialog(true);
      } else {
        setShowLeaveDialog(true);
      }
    }, [isOnlyAdmin, otherMembers.length]);

    // Handle transfer admin role
    const handleTransferAdmin = useCallback(async () => {
      if (!selectedNewAdmin) return;

      setIsTransferringAdmin(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast.error('Supabase is not configured');
        setIsTransferringAdmin(false);
        return;
      }

      try {
        // Update the selected member to admin
        const { error: updateError } = await supabase
          .from('user_bands')
          .update({ role: 'admin' })
          .eq('user_id', selectedNewAdmin)
          .eq('band_id', bandId);

        if (updateError) throw updateError;

        toast.success('Admin role transferred successfully');
        setShowTransferDialog(false);
        setSelectedNewAdmin(null);

        // Reload members to reflect the change
        await loadMembers();

        // Now show the leave dialog
        setShowLeaveDialog(true);
      } catch (err) {
        console.error('Error transferring admin role:', err);
        toast.error('Failed to transfer admin role. Please try again.');
      } finally {
        setIsTransferringAdmin(false);
      }
    }, [selectedNewAdmin, bandId, loadMembers]);

    // Handle confirm leave band
    const handleConfirmLeave = useCallback(async () => {
      setIsLeavingBand(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast.error('Supabase is not configured');
        setIsLeavingBand(false);
        return;
      }

      try {
        // Delete the user_bands record for the current user
        const { error } = await supabase
          .from('user_bands')
          .delete()
          .eq('user_id', currentUserId)
          .eq('band_id', bandId);

        if (error) throw error;

        setShowLeaveDialog(false);
        toast.success('You have left the band');
        await onLeaveBand();
      } catch (err) {
        console.error('Error leaving band:', err);
        toast.error('Failed to leave band. Please try again.');
      } finally {
        setIsLeavingBand(false);
      }
    }, [currentUserId, bandId, onLeaveBand]);

    // Handle confirm delete band
    const handleConfirmDelete = useCallback(async () => {
      setIsDeletingBand(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast.error('Supabase is not configured');
        setIsDeletingBand(false);
        return;
      }

      try {
        // Delete the band (cascades to user_bands, songs, etc.)
        const { error } = await supabase
          .from('bands')
          .delete()
          .eq('id', bandId);

        if (error) throw error;

        setShowDeleteDialog(false);
        toast.success('Band deleted successfully');
        await onDeleteBand();
      } catch (err) {
        console.error('Error deleting band:', err);
        toast.error('Failed to delete band. Please try again.');
      } finally {
        setIsDeletingBand(false);
      }
    }, [bandId, onDeleteBand]);

    // Close leave dialog
    const closeLeaveDialog = useCallback(() => {
      if (!isLeavingBand) {
        setShowLeaveDialog(false);
      }
    }, [isLeavingBand]);

    // Close delete dialog
    const closeDeleteDialog = useCallback(() => {
      if (!isDeletingBand) {
        setShowDeleteDialog(false);
      }
    }, [isDeletingBand]);

    // Close transfer dialog
    const closeTransferDialog = useCallback(() => {
      if (!isTransferringAdmin) {
        setShowTransferDialog(false);
        setSelectedNewAdmin(null);
      }
    }, [isTransferringAdmin]);

    return (
      <div className="space-y-6">
        {/* Band Name Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Band Information
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Manage your band settings and membership.'
                : 'View band information and manage your membership.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Band Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Band Name</label>
              {isEditing && isAdmin ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={cn('flex-1', nameError && 'border-destructive')}
                    autoFocus
                    disabled={isUpdatingName}
                    maxLength={50}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveName}
                    disabled={isUpdatingName}
                    className="text-success hover:text-success hover:bg-success/10"
                    aria-label="Save band name"
                  >
                    {isUpdatingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelEditing}
                    disabled={isUpdatingName}
                    aria-label="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <span className="text-foreground font-semibold">{bandName}</span>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStartEditing}
                      aria-label="Edit band name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {editedName.length}/50 characters
              </p>
            </div>

            {/* Your Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Your Role</label>
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Administrator</span>
                    <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
                      Admin
                    </Badge>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Member</span>
                    <Badge variant="outline" className="ml-auto">
                      Member
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Band Members Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Band Members
            </CardTitle>
            <CardDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in this band
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMembers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => (
                  <div
                    key={member.userId}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      member.isCurrentUser
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {member.isCurrentUser ? 'You' : `Member ${members.indexOf(member) + 1}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">Member</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Band Card */}
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="font-serif text-warning flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Leave Band
            </CardTitle>
            <CardDescription>
              {isOnlyAdmin && otherMembers.length > 0
                ? 'You must transfer admin rights to another member before leaving.'
                : 'Remove yourself from this band. You can be re-invited later.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleLeaveClick}
              className="gap-2 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
            >
              <LogOut className="h-4 w-4" />
              {isOnlyAdmin && otherMembers.length > 0 ? 'Transfer Admin & Leave' : 'Leave Band'}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Band Card (Admin Only) */}
        {isAdmin && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-serif text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Band
              </CardTitle>
              <CardDescription>
                Permanently delete this band and all its data. This includes all songs, members,
                events, and settings. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Band
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leave Band Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showLeaveDialog}
          title="Leave Band"
          message={
            members.length === 1
              ? `You are the only member of "${bandName}". Leaving will delete the band and all its data.`
              : `Are you sure you want to leave "${bandName}"? You will lose access to this band's songs, events, and settings.`
          }
          variant="warning"
          confirmLabel={isLeavingBand ? 'Leaving...' : 'Leave Band'}
          cancelLabel="Cancel"
          onConfirm={handleConfirmLeave}
          onCancel={closeLeaveDialog}
        />

        {/* Transfer Admin Dialog */}
        <AlertDialog open={showTransferDialog} onOpenChange={(open) => !open && closeTransferDialog()}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-info/20">
                  <Crown className="h-6 w-6 text-info" />
                </div>
                <div className="flex flex-col gap-2">
                  <AlertDialogTitle>Transfer Admin Role</AlertDialogTitle>
                  <AlertDialogDescription>
                    As the only admin, you must transfer admin rights before leaving. Select a member to become the new admin.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <div className="mt-4 space-y-2">
              {nonAdminMembers.map((member, index) => (
                <div
                  key={member.userId}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedNewAdmin === member.userId
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedNewAdmin(member.userId)}
                >
                  <input
                    type="radio"
                    name="new-admin"
                    checked={selectedNewAdmin === member.userId}
                    onChange={() => setSelectedNewAdmin(member.userId)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="font-medium text-foreground">Member {index + 1}</span>
                </div>
              ))}
            </div>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel disabled={isTransferringAdmin}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTransferAdmin}
                disabled={!selectedNewAdmin || isTransferringAdmin}
                className="bg-info text-info-foreground hover:bg-info/90"
              >
                {isTransferringAdmin ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Transfer & Continue'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Band Dangerous Action Dialog */}
        <DangerousActionDialog
          isOpen={showDeleteDialog}
          title="Delete Band"
          message={`This will permanently delete "${bandName}" and all associated data including songs, events, members, and settings. This action cannot be undone.`}
          confirmPhrase={bandName}
          confirmLabel={isDeletingBand ? 'Deleting...' : 'Delete Band'}
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteDialog}
        />
      </div>
    );
  }
);

BandSettingsSection.displayName = 'BandSettingsSection';
