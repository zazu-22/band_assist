import React, { memo, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/primitives';
import { AuthLayout } from '@/components/AuthLayout';
import { getSupabaseClient } from '@/services/supabaseClient';
import { validatePassword, PASSWORD_HINT } from '@/utils/validation';

interface PasswordUpdateProps {
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const PasswordUpdate: React.FC<PasswordUpdateProps> = memo(function PasswordUpdate({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'password' | 'confirmPassword' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase is not configured.');
        setIsValidSession(false);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasAccessToken = hashParams.has('access_token');
      const tokenType = hashParams.get('type');

      if (!hasAccessToken || tokenType !== 'recovery') {
        setError('Invalid or expired password reset link. Please request a new one.');
        setIsValidSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Invalid or expired password reset link. Please request a new one.');
        setIsValidSession(false);
        return;
      }

      // SECURITY: Clear sensitive auth tokens from URL immediately after successful session verification
      // We clear here (not on unmount) to:
      // 1. Prevent tokens from appearing in browser history
      // 2. Avoid race conditions if component unmounts during auth flow
      // 3. Remove sensitive data from URL before user can copy/share link
      // Using replaceState instead of hash='' to avoid triggering navigation events
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    setIsLoading(true);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      setErrorField('password');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setErrorField('confirmPassword');
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [password, confirmPassword, onSuccess]);

  return (
    <AuthLayout title="Band Assist" subtitle="Set your new password">
      {!isValidSession ? (
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4" role="alert">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button onClick={onSuccess} className="w-full">
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus
              aria-invalid={errorField === 'password'}
              aria-describedby={
                errorField === 'password' ? 'form-error password-help' : 'password-help'
              }
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p id="password-help" className="text-xs text-muted-foreground">
              {PASSWORD_HINT}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              aria-invalid={errorField === 'confirmPassword'}
              aria-describedby={errorField === 'confirmPassword' ? 'form-error' : undefined}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3" role="alert">
              <p id="form-error" className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
});

PasswordUpdate.displayName = 'PasswordUpdate';
