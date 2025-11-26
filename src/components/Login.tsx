import React, { memo, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@/components/primitives';
import { AuthLayout } from '@/components/AuthLayout';
import { getSupabaseClient } from '@/services/supabaseClient';
import { validateEmail, normalizeEmail } from '@/utils/validation';

interface LoginProps {
  onLoginSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const Login: React.FC<LoginProps> = memo(function Login({ onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to sign in. Check your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, password, onLoginSuccess]);

  const handleNavigateToSignup = useCallback(() => {
    onNavigate('SIGNUP');
  }, [onNavigate]);

  const handleNavigateToPasswordReset = useCallback(() => {
    onNavigate('PASSWORD_RESET');
  }, [onNavigate]);

  return (
    <AuthLayout title="Band Assist" subtitle="Sign in to access your band's workspace">
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
            placeholder="band@yourband.com"
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
            autoComplete="current-password"
            placeholder="••••••••"
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
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Help Text */}
      <div className="mt-6 text-center space-y-3">
        <div>
          <Button variant="link" onClick={handleNavigateToSignup} className="text-sm">
            Don&apos;t have an account? Sign up
          </Button>
        </div>
        <div>
          <Button variant="link" onClick={handleNavigateToPasswordReset} className="text-sm text-muted-foreground">
            Forgot password?
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
});

Login.displayName = 'Login';
