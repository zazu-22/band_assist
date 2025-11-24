import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Mail, Check, X, Trash2, Clock } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { validateEmail, normalizeEmail } from '../utils/validation';

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

/**
 * InvitationManager Component
 *
 * Allows band admins to invite new members via email.
 * Shows pending, accepted, and cancelled invitations.
 */
export const InvitationManager: React.FC<InvitationManagerProps> = ({
  bandId,
  currentUserId,
  isAdmin,
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadInvitations = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

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
      return data || [];
    } catch (err) {
      console.error('Error loading invitations:', err);
      return [];
    }
  }, [bandId]);

  // Load invitations with cancellation support
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const data = await loadInvitations();

      // Check cancellation before updating state
      if (!cancelled) {
        setInvitations(data);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [loadInvitations]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validate email format
    const validation = validateEmail(newEmail);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid email address');
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

    // Normalize email for storage
    const normalizedEmail = normalizeEmail(newEmail);

    try {
      // Check rate limit (10 invitations per hour per band)
      const { data: rateLimitCheck, error: rateLimitError } = await supabase
        .rpc('check_invitation_rate_limit', { p_band_id: bandId });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        setError('Unable to verify rate limit. Please try again.');
        setIsLoading(false);
        return; // Fail closed - don't allow invitation if check fails
      }

      if (rateLimitCheck === false) {
        setError('Rate limit exceeded. Maximum 10 invitations per hour per band.');
        setIsLoading(false);
        return;
      }

      // Check if invitation already exists
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

      // Create invitation
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          band_id: bandId,
          email: normalizedEmail,
          invited_by: currentUserId,
          status: 'pending',
        });

      if (inviteError) {
        // Check if error is due to rate limit constraint
        if (inviteError.message?.includes('check_rate_limit')) {
          setError('Rate limit exceeded. Maximum 10 invitations per hour per band.');
        } else {
          throw inviteError;
        }
        setIsLoading(false);
        return;
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
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!isAdmin) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      loadInvitations();
    } catch (err) {
      console.error('Error cancelling invitation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50',
      accepted: 'bg-green-900/20 text-green-400 border-green-900/50',
      cancelled: 'bg-red-900/20 text-red-400 border-red-900/50',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${styles[status as keyof typeof styles]}`}
      >
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-zinc-100">Team Invitations</h3>
      </div>

      {/* Invitation Form */}
      {isAdmin && (
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Invite by Email
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-400">{successMessage}</p>
            </div>
          )}

          <p className="text-xs text-zinc-500">
            New members will automatically join the band when they sign up with the invited email
            address.
          </p>
        </form>
      )}

      {!isAdmin && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-sm text-zinc-400">
            Only band admins can invite new members. Contact your band administrator to send
            invitations.
          </p>
        </div>
      )}

      {/* Invitations List */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-400">Invitation History</h4>
          <div className="space-y-2">
            {invitations.map(invitation => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{invitation.email}</p>
                  <p className="text-xs text-zinc-500">
                    Invited {formatDate(invitation.invited_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(invitation.status)}
                  {isAdmin && invitation.status === 'pending' && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                      title="Cancel invitation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitations.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No invitations sent yet</p>
        </div>
      )}
    </div>
  );
};
