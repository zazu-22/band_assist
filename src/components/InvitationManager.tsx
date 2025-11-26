import React, { memo, useState, useEffect, useCallback } from 'react';
import { UserPlus, Mail, Check, X, Trash2, Clock, Loader2 } from 'lucide-react';
import { Button, Input, Label, Badge, Card, CardContent } from '@/components/primitives';
import { EmptyState } from '@/components/ui';
import { getSupabaseClient } from '@/services/supabaseClient';
import { validateEmail, normalizeEmail } from '@/utils/validation';

interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'cancelled';
  invited_at: string;
  invited_by: string;
}

interface InvitationManagerProps {
  bandId: string;
  currentUserId: string;
  isAdmin: boolean;
}

/** PostgreSQL error structure returned by Supabase */
interface PostgresError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/** Type guard to check if an error is a PostgreSQL error */
function isPostgresError(error: unknown): error is PostgresError {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  return 'code' in error || 'message' in error;
}

/** Format date for display */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Get status icon component */
function getStatusIcon(status: string) {
  switch (status) {
    case 'accepted':
      return <Check className="w-4 h-4 text-success" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-destructive" />;
    default:
      return <Clock className="w-4 h-4 text-warning" />;
  }
}

/** Get status badge variant and styling */
function getStatusBadgeStyle(status: string): string {
  const styles = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    accepted: 'bg-success/20 text-success border-success/30',
    cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  };
  return styles[status as keyof typeof styles] || styles.pending;
}

export const InvitationManager: React.FC<InvitationManagerProps> = memo(function InvitationManager({
  bandId,
  currentUserId,
  isAdmin,
}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasValidationError, setHasValidationError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadInvitations = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setInvitations([]);
      return;
    }

    try {
      const { data, error } = (await supabase
        .from('invitations')
        .select('*')
        .eq('band_id', bandId)
        .order('invited_at', { ascending: false })) as {
        data: Invitation[] | null;
        error: unknown;
      };

      if (error) throw error;
      setInvitations(data || []);
    } catch (err) {
      console.error('Error loading invitations:', err);
      setInvitations([]);
    }
  }, [bandId]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setHasValidationError(false);
    setSuccessMessage('');

    const validation = validateEmail(newEmail);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid email address');
      setHasValidationError(true);
      return;
    }

    if (!isAdmin) {
      setError('Only band admins can send invitations');
      return;
    }

    setIsLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured');
      setIsLoading(false);
      return;
    }

    const normalizedEmail = normalizeEmail(newEmail);

    try {
      const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
        'check_invitation_rate_limit',
        { p_band_id: bandId }
      );

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        setError('Unable to verify rate limit. Please try again.');
        setIsLoading(false);
        return;
      }

      if (rateLimitCheck === false) {
        setError('Rate limit exceeded. Maximum 10 invitations per hour per band.');
        setIsLoading(false);
        return;
      }

      const { data: isMember, error: memberCheckError } = await supabase.rpc(
        'is_email_band_member',
        { p_band_id: bandId, p_email: normalizedEmail }
      );

      if (memberCheckError) {
        console.error('Member check error:', memberCheckError);
        setError('Unable to verify membership. Please try again.');
        setIsLoading(false);
        return;
      }

      if (isMember) {
        setError('This email address is already a member of the band.');
        setIsLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from('invitations')
        .select('*')
        .eq('band_id', bandId)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .single();

      if (existing) {
        setError('An invitation has already been sent to this email');
        setIsLoading(false);
        return;
      }

      const { error: inviteError } = await supabase.from('invitations').insert({
        band_id: bandId,
        email: normalizedEmail,
        invited_by: currentUserId,
        status: 'pending',
      });

      if (inviteError) {
        if (isPostgresError(inviteError)) {
          const { code, message } = inviteError;
          if (code === 'P0001' || message?.includes('Rate limit exceeded')) {
            setError('Rate limit exceeded. Maximum 10 invitations per hour per band.');
            setIsLoading(false);
            return;
          }
        }
        throw inviteError;
      }

      setSuccessMessage(`Invitation sent to ${normalizedEmail}`);
      setNewEmail('');
      loadInvitations();
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  }, [newEmail, isAdmin, bandId, currentUserId, loadInvitations]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    if (!isAdmin) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      setSuccessMessage('Invitation cancelled');
      loadInvitations();
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError('Failed to cancel invitation. Please try again.');
    }
  }, [isAdmin, loadInvitations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Team Invitations</h3>
      </div>

      {/* Invitation Form */}
      {isAdmin && (
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-email">Invite by Email</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="invitation-email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="member@example.com"
                  autoFocus
                  aria-invalid={hasValidationError}
                  aria-describedby={hasValidationError ? 'invitation-error' : undefined}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3" role="alert">
              <p id="invitation-error" className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3">
              <p className="text-sm text-success">{successMessage}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            New members will automatically join the band when they sign up with the invited email
            address.
          </p>
        </form>
      )}

      {!isAdmin && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Only band admins can invite new members. Contact your band administrator to send
              invitations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invitations List */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Invitation History</h4>
          <div className="space-y-2">
            {invitations.map(invitation => (
              <Card key={invitation.id} className="bg-muted/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDate(invitation.invited_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeStyle(invitation.status)}
                    >
                      {getStatusIcon(invitation.status)}
                      <span className="ml-1 capitalize">{invitation.status}</span>
                    </Badge>
                    {isAdmin && invitation.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title="No invitations sent yet"
          description="Invite band members by email to collaborate on your setlist and schedule."
        />
      )}
    </div>
  );
});

InvitationManager.displayName = 'InvitationManager';
