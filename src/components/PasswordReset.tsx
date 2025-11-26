import React, { memo, useState, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/primitives';
import { AuthLayout } from '@/components/AuthLayout';
import { getSupabaseClient } from '@/services/supabaseClient';
import { validateEmail, normalizeEmail } from '@/utils/validation';

interface PasswordResetProps {
  onNavigate: (view: string) => void;
}

export const PasswordReset: React.FC<PasswordResetProps> = memo(function PasswordReset({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email address');
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured. Check environment variables.');
      setIsLoading(false);
      return;
    }

    try {
      const normalizedEmail = normalizeEmail(email);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/#password-update`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleNavigateToLogin = useCallback(() => {
    onNavigate('LOGIN');
  }, [onNavigate]);

  return (
    <AuthLayout title="Band Assist" subtitle="Reset your password">
      {success ? (
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-md p-4">
            <p className="text-sm text-success font-medium mb-2">Check your email!</p>
            <p className="text-xs text-success/80">
              We&apos;ve sent you a password reset link. Click the link in the email to reset your
              password.
            </p>
          </div>
          <Button onClick={handleNavigateToLogin} className="w-full">
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>
      )}

      {/* Back to Login */}
      {!success && (
        <div className="mt-6 text-center">
          <Button variant="link" onClick={handleNavigateToLogin} className="text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Button>
        </div>
      )}
    </AuthLayout>
  );
});

PasswordReset.displayName = 'PasswordReset';
