import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Signup } from './Signup';

// Mock Supabase client
const mockSignUp = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}));

describe('Signup', () => {
  const defaultProps = {
    onSignupSuccess: vi.fn(),
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({
      data: { user: { id: '123' }, session: {} },
      error: null,
    });
  });

  describe('rendering', () => {
    it('renders signup form', () => {
      render(<Signup {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('renders password hint', () => {
      render(<Signup {...defaultProps} />);
      expect(screen.getByText(/Must be at least 8 characters/)).toBeInTheDocument();
    });

    it('renders back to login link', () => {
      render(<Signup {...defaultProps} />);
      expect(screen.getByText(/Back to Sign In/)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates email before submission', async () => {
      const user = userEvent.setup();
      render(<Signup {...defaultProps} />);

      // Invalid email without TLD
      await user.type(screen.getByLabelText('Email'), 'test@nodomain');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.type(screen.getByLabelText('Confirm Password'), 'Password1!');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Validation should prevent API call
      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      render(<Signup {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'weak');
      await user.type(screen.getByLabelText('Confirm Password'), 'weak');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Weak password should prevent API call
      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it('validates password match', async () => {
      const user = userEvent.setup();
      render(<Signup {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'Password1!');
      await user.type(screen.getByLabelText('Confirm Password'), 'Different1!');
      await user.click(screen.getByRole('button', { name: 'Create Account' }));

      // Mismatched passwords should prevent API call
      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('navigation', () => {
    it('navigates to login when back link clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<Signup {...defaultProps} onNavigate={onNavigate} />);

      await user.click(screen.getByText(/Back to Sign In/));

      expect(onNavigate).toHaveBeenCalledWith('LOGIN');
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(Signup.displayName).toBe('Signup');
    });
  });
});
