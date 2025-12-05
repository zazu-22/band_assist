import React, { useState, memo } from 'react';
import { Loader2, AlertCircle, Info } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives';
import { toast, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { useLinkedMember } from '@/hooks/useLinkedMember';
import { claimMember } from '@/services/supabaseStorageService';
import { getAvatarColor, getInitials } from '@/lib/avatar';

interface LinkAccountSectionProps {
  currentBandId: string | undefined;
  currentUserId: string | undefined;
}

/**
 * LinkAccountSection component for claiming member records
 * Displays linked member or dropdown to claim unlinked members
 */
export const LinkAccountSection = memo(function LinkAccountSection({
  currentBandId,
  currentUserId,
}: LinkAccountSectionProps) {
  const { linkedMember, unlinkedMembers, isLoading, error, refetch } = useLinkedMember(currentBandId || null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState(false);

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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Your Account</CardTitle>
        <CardDescription>
          Connect your user account to a band member record for personalized features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkedMember ? (
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
            <Badge variant="secondary" className="ml-auto">
              Linked
            </Badge>
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
  );
});

LinkAccountSection.displayName = 'LinkAccountSection';
