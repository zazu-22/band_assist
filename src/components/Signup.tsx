import React, { memo, useState, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/primitives';
import { AuthLayout } from '@/components/AuthLayout';
import { getSupabaseClient } from '@/services/supabaseClient';
import { validateEmail, validatePassword, normalizeEmail, PASSWORD_HINT } from '@/utils/validation';

interface SignupProps {
  onSignupSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const Signup: React.FC<SignupProps> = memo(function Signup({ onSignupSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'email' | 'password' | 'confirmPassword' | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setErrorField(null);
      setSuccess(false);
      setIsLoading(true);

      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || 'Invalid email address');
        setErrorField('email');
        setIsLoading(false);
        return;
      }

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
        setError('Supabase is not configured. Check environment variables.');
        setIsLoading(false);
        return;
      }

      try {
        const normalizedEmail = normalizeEmail(email);
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (authError) {
          throw authError;
        }

        if (data.user) {
          if (data.session) {
            onSignupSuccess();
          } else {
            setSuccess(true);
          }
        }
      } catch (err) {
        console.error('Signup error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to create account. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, confirmPassword, onSignupSuccess]
  );

  const handleNavigateToLogin = useCallback(() => {
    onNavigate('LOGIN');
  }, [onNavigate]);

  return (
    <AuthLayout title="Band Assist" subtitle="Create your account">
      {success ? (
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-md p-4">
            <p className="text-sm text-success font-medium mb-2">Account created successfully!</p>
            <p className="text-xs text-success/80 mb-2">
              Check your email for a confirmation link to activate your account.
            </p>
            <p className="text-xs text-success/60">
              If you were invited to a band, you&apos;ll be automatically added once you confirm
              your email.
            </p>
          </div>
          <Button onClick={handleNavigateToLogin} className="w-full">
            Go to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
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
              autoFocus
              aria-invalid={errorField === 'email'}
              aria-describedby={errorField === 'email' ? 'form-error' : undefined}
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
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

          {/* Error Message */}
          {error && (
            <div
              className="bg-destructive/10 border border-destructive/30 rounded-md p-3"
              role="alert"
            >
              <p id="form-error" className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      )}

      {/* Back to Login */}
      {!success && (
        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={handleNavigateToLogin}
            className="text-sm text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Button>
        </div>
      )}
    </AuthLayout>
  );
});

Signup.displayName = 'Signup';
