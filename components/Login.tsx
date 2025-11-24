import React, { useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { validateEmail, normalizeEmail } from '../utils/validation';
import { AuthLayout } from './AuthLayout';

interface LoginProps {
  onLoginSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Email validation
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
  };

  return (
    <AuthLayout title="Band Assist" subtitle="Sign in to access your band's workspace">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="band@yourband.com"
            disabled={isLoading}
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-md p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-6 text-center space-y-3">
        <div>
          <button
            onClick={() => onNavigate('SIGNUP')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Don&apos;t have an account? Sign up
          </button>
        </div>
        <div>
          <button
            onClick={() => onNavigate('PASSWORD_RESET')}
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
