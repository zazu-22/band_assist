import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordReset } from './PasswordReset';

// Mock Supabase client
const mockResetPasswordForEmail = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}));

describe('PasswordReset', () => {
  const defaultProps = {
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  describe('rendering', () => {
    it('renders password reset form', () => {
      render(<PasswordReset {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
    });

    it('renders instructions', () => {
      render(<PasswordReset {...defaultProps} />);
      expect(screen.getByText(/Enter your email address/)).toBeInTheDocument();
    });

    it('renders back to login link', () => {
      render(<PasswordReset {...defaultProps} />);
      expect(screen.getByText(/Back to Sign In/)).toBeInTheDocument();
    });

    it('renders title and subtitle', () => {
      render(<PasswordReset {...defaultProps} />);
      expect(screen.getByText('Band Assist')).toBeInTheDocument();
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates email before submission', async () => {
      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      // Invalid email without TLD
      await user.type(screen.getByLabelText('Email'), 'test@nodomain');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      // Validation should prevent API call
      await waitFor(() => {
        expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('form submission', () => {
    it('calls resetPasswordForEmail with normalized email', async () => {
      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'Test@Example.COM');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('password-update'),
          })
        );
      });
    });

    it('shows success message on successful submission', async () => {
      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument();
        expect(screen.getByText(/We've sent you a password reset link/)).toBeInTheDocument();
      });
    });

    it('shows error on failed submission', async () => {
      // Mock throwing an actual Error to simulate Supabase error
      const resetError = new Error('Rate limit exceeded');
      mockResetPasswordForEmail.mockResolvedValueOnce({
        error: resetError,
      });

      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables input during submission', async () => {
      mockResetPasswordForEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );

      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeDisabled();
      });
    });

    it('shows loading text during submission', async () => {
      mockResetPasswordForEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );

      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to login when back link clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<PasswordReset {...defaultProps} onNavigate={onNavigate} />);

      await user.click(screen.getByText(/Back to Sign In/));

      expect(onNavigate).toHaveBeenCalledWith('LOGIN');
    });

    it('navigates to login from success screen', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<PasswordReset {...defaultProps} onNavigate={onNavigate} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Back to Sign In' }));

      expect(onNavigate).toHaveBeenCalledWith('LOGIN');
    });
  });

  describe('success state', () => {
    it('hides form and back link on success', async () => {
      const user = userEvent.setup();
      render(<PasswordReset {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument();
      });

      // Form elements should be hidden
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send Reset Link' })).not.toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(PasswordReset.displayName).toBe('PasswordReset');
    });
  });
});
