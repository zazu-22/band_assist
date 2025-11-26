import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

describe('Login', () => {
  const defaultProps = {
    onLoginSuccess: vi.fn(),
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  });

  describe('rendering', () => {
    it('renders login form', () => {
      render(<Login {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      render(<Login {...defaultProps} />);
      expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('renders title and subtitle', () => {
      render(<Login {...defaultProps} />);
      expect(screen.getByText('Band Assist')).toBeInTheDocument();
      expect(screen.getByText(/Sign in to access/)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates email before submission', async () => {
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      // Type invalid email (no TLD)
      await user.type(screen.getByLabelText('Email'), 'test@nodomain');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      // Validation should prevent API call
      await waitFor(() => {
        expect(mockSignInWithPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe('form submission', () => {
    it('calls signInWithPassword with normalized email', async () => {
      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'Test@Example.COM');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Password1!',
        });
      });
    });

    it('calls onLoginSuccess on successful login', async () => {
      const user = userEvent.setup();
      const onLoginSuccess = vi.fn();
      render(<Login {...defaultProps} onLoginSuccess={onLoginSuccess} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(onLoginSuccess).toHaveBeenCalled();
      });
    });

    it('shows error on failed login', async () => {
      // Mock throwing an actual Error to simulate Supabase error
      const authError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null },
        error: authError,
      });

      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'WrongPass1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables inputs during submission', async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ data: { session: {} }, error: null }), 100)
        )
      );

      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
        expect(screen.getByLabelText('Password')).toBeDisabled();
      });
    });

    it('shows loading text during submission', async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ data: { session: {} }, error: null }), 100)
        )
      );

      const user = userEvent.setup();
      render(<Login {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Sign In' }));

      await waitFor(() => {
        expect(screen.getByText('Signing in...')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to signup when link clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<Login {...defaultProps} onNavigate={onNavigate} />);

      await user.click(screen.getByText(/Don't have an account/));

      expect(onNavigate).toHaveBeenCalledWith('SIGNUP');
    });

    it('navigates to password reset when link clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<Login {...defaultProps} onNavigate={onNavigate} />);

      await user.click(screen.getByText('Forgot password?'));

      expect(onNavigate).toHaveBeenCalledWith('PASSWORD_RESET');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(Login.displayName).toBe('Login');
    });
  });
});
