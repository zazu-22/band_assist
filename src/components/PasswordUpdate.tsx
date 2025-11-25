import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { validatePassword, PASSWORD_HINT } from '../utils/validation';
import { AuthLayout } from './AuthLayout';

interface PasswordUpdateProps {
  onSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const PasswordUpdate: React.FC<PasswordUpdateProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'password' | 'confirmPassword' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(true);

  useEffect(() => {
    // Verify we have a valid recovery session (not just any authenticated session)
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Supabase is not configured.');
        setIsValidSession(false);
        return;
      }

      // Check for access_token and type=recovery in URL hash
      // This ensures it's specifically a recovery session, not a regular login
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hasAccessToken = hashParams.has('access_token');
      const tokenType = hashParams.get('type');

      if (!hasAccessToken || tokenType !== 'recovery') {
        setError('Invalid or expired password reset link. Please request a new one.');
        setIsValidSession(false);
        return;
      }

      // Verify the session is valid
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Invalid or expired password reset link. Please request a new one.');
        setIsValidSession(false);
      }
    };

    checkSession();

    // Cleanup: Clear hash on unmount to prevent persistence issues
    return () => {
      // Always clear hash when leaving password update screen
      // to prevent accidental reuse or navigation issues
      const hash = window.location.hash;
      if (hash.includes('access_token') || hash.includes('type=recovery')) {
        window.location.hash = '';
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorField(null);
    setIsLoading(true);

    // Validate password
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

      // Success - redirect to login
      onSuccess();
    } catch (err) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Band Assist" subtitle="Set your new password">
      {!isValidSession ? (
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-800 rounded-md p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={onSuccess}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              New Password
            </label>
            <input
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
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p id="password-help" className="text-xs text-zinc-500 mt-1">
              {PASSWORD_HINT}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              aria-invalid={errorField === 'confirmPassword'}
              aria-describedby={errorField === 'confirmPassword' ? 'form-error' : undefined}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-md p-3" role="alert">
              <p id="form-error" className="text-sm text-red-400">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Updating password...
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
