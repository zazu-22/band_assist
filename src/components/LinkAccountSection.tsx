import React, { useState, memo, useCallback } from 'react';
import { Loader2, AlertCircle, Info, Unlink } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Avatar,
  AvatarFallback,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/primitives';
import { toast, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { claimMember, unlinkMember } from '@/services/supabaseStorageService';
import { getAvatarColor, getInitials } from '@/lib/avatar';
import type { BandMember } from '@/types';

interface LinkAccountSectionProps {
  currentBandId: string | undefined;
  currentUserId: string | undefined;
  availableRoles: string[];
  onUpdateMember: (member: BandMember) => void;
}

/**
 * LinkAccountSection component for claiming member records
 * Displays linked member or dropdown to claim unlinked members
 * Also allows setting preferred instrument for GP track auto-selection
 */
export const LinkAccountSection = memo(function LinkAccountSection({
  currentBandId,
  currentUserId,
  availableRoles,
  onUpdateMember,
}: LinkAccountSectionProps) {
  const { linkedMember, unlinkedMembers, isLoading, error, refetch } = useLinkedMember(currentBandId || null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Sentinel value for "None" option since Radix Select requires non-empty string values
  const NONE_VALUE = '__none__';

  const handlePreferredInstrumentChange = async (value: string) => {
    if (!linkedMember) return;

    setIsSavingPreference(true);
    try {
      // NONE_VALUE means "None" was selected, convert to null
      const preferredInstrument = value === NONE_VALUE ? null : value;
      onUpdateMember({
        ...linkedMember,
        preferredInstrument,
      });
      toast.success('Preferred instrument saved');
    } catch (err) {
      console.error('Failed to save preferred instrument:', err);
      toast.error('Failed to save preferred instrument');
    } finally {
      setIsSavingPreference(false);
    }
  };

  const handleClaimMember = async () => {
    if (!selectedMemberId || !currentBandId || !currentUserId) return;

    setIsClaiming(true);

    try {
      await claimMember(currentUserId, selectedMemberId, currentBandId);

      toast.success('Member claimed successfully');

      await refetch();
      setSelectedMemberId('');
    } catch (err) {
      console.error('Error claiming member:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to claim member';

      toast.error('Failed to claim member', {
        description: errorMessage,
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUnlink = useCallback(async () => {
    if (!currentBandId || !currentUserId) return;

    setIsUnlinking(true);

    try {
      await unlinkMember(currentUserId, currentBandId);

      toast.success('Member unlinked successfully');

      setShowUnlinkDialog(false);
      await refetch();
    } catch (err) {
      console.error('Error unlinking member:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to unlink member';

      toast.error('Failed to unlink member', {
        description: errorMessage,
      });
    } finally {
      setIsUnlinking(false);
    }
  }, [currentBandId, currentUserId, refetch]);

  const handleUnlinkDialogOpenChange = useCallback((open: boolean) => {
    if (!isUnlinking) {
      setShowUnlinkDialog(open);
    }
  }, [isUnlinking]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Your Account</CardTitle>
          <CardDescription>
            Connect your user account to a band member record for personalized features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading member information" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Your Account</CardTitle>
          <CardDescription>
            Connect your user account to a band member record for personalized features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Link Your Account</CardTitle>
        <CardDescription>
          Connect your user account to a band member record for personalized features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkedMember ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className={getAvatarColor(linkedMember.avatarColor)}>
                  <AvatarFallback>{getInitials(linkedMember.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{linkedMember.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {linkedMember.roles.join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Linked</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnlinkDialog(true)}
                  disabled={isUnlinking}
                  aria-label="Unlink member"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Preferred Instrument Selector */}
            <div className="pt-4 border-t border-border">
              <Label htmlFor="preferred-instrument" className="text-sm font-medium">
                Preferred Instrument
              </Label>
              <Select
                value={linkedMember.preferredInstrument || NONE_VALUE}
                onValueChange={handlePreferredInstrumentChange}
                disabled={isSavingPreference}
              >
                <SelectTrigger id="preferred-instrument" className="mt-1.5">
                  <SelectValue placeholder="Select your instrument..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-selects matching track when opening Guitar Pro files
              </p>
            </div>
          </div>
        ) : unlinkedMembers.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the band member that represents you:
            </p>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {unlinkedMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className={`h-6 w-6 ${getAvatarColor(member.avatarColor)}`}>
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground">
                        ({member.roles.join(', ')})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleClaimMember}
              disabled={!selectedMemberId || isClaiming}
              className="w-full"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim Member'
              )}
            </Button>
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No members available</AlertTitle>
            <AlertDescription>
              All members are already linked. Contact your band admin if you need to claim a member.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>

    {/* Unlink Confirmation Dialog */}
    <AlertDialog open={showUnlinkDialog} onOpenChange={handleUnlinkDialogOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unlink from &ldquo;{linkedMember?.name}&rdquo;? You can link to a different member afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnlink}
            disabled={isUnlinking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isUnlinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlinking...
              </>
            ) : (
              'Unlink'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
});

LinkAccountSection.displayName = 'LinkAccountSection';
