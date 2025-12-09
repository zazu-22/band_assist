import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateBandDialog } from '../CreateBandDialog';

describe('CreateBandDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the modal when open', () => {
      render(<CreateBandDialog {...defaultProps} />);

      expect(screen.getByText('Create New Band')).toBeInTheDocument();
      expect(screen.getByText("You'll become the admin of this new band")).toBeInTheDocument();
    });

    it('should not render content when closed', () => {
      render(<CreateBandDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create New Band')).not.toBeInTheDocument();
    });

    it('should render band name input field', () => {
      render(<CreateBandDialog {...defaultProps} />);

      expect(screen.getByLabelText(/band name/i)).toBeInTheDocument();
    });

    it('should render Create Band button', () => {
      render(<CreateBandDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /create band/i })).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<CreateBandDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(<CreateBandDialog {...defaultProps} />);

      expect(screen.getByText('0/100 characters')).toBeInTheDocument();
    });

    it('should have the band name input', () => {
      render(<CreateBandDialog {...defaultProps} />);

      const input = screen.getByLabelText(/band name/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('form state', () => {
    it('should reset form when dialog opens', async () => {
      const { rerender } = render(<CreateBandDialog {...defaultProps} isOpen={false} />);

      // Open dialog
      rerender(<CreateBandDialog {...defaultProps} isOpen={true} />);

      const input = screen.getByLabelText(/band name/i);
      expect(input).toHaveValue('');
    });

    it('should update character count as user types (using trimmed length)', async () => {
      const user = userEvent.setup();
      render(<CreateBandDialog {...defaultProps} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      expect(screen.getByText('9/100 characters')).toBeInTheDocument();

      // Verify trailing spaces don't increase count
      await user.type(input, '   ');
      expect(screen.getByText('9/100 characters')).toBeInTheDocument();
    });

    it('should have maxLength attribute on input', () => {
      render(<CreateBandDialog {...defaultProps} />);

      const input = screen.getByLabelText(/band name/i);
      expect(input).toHaveAttribute('maxLength', '100');
    });
  });

  describe('validation', () => {
    it('should disable submit button when input is empty', () => {
      render(<CreateBandDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create band/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input has content', async () => {
      const user = userEvent.setup();
      render(<CreateBandDialog {...defaultProps} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when input is only whitespace', async () => {
      const user = userEvent.setup();
      render(<CreateBandDialog {...defaultProps} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, '   ');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      // Button should still be disabled since trimmed value is empty
      expect(submitButton).toBeDisabled();
    });

    it('should not call onSubmit when button is disabled', async () => {
      const user = userEvent.setup();
      render(<CreateBandDialog {...defaultProps} />);

      // Try to submit with empty input (button is disabled)
      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('successful submission', () => {
    it('should call onSubmit with trimmed band name', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, '  My Awesome Band  ');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('My Awesome Band');
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const deferred = createDeferredPromise<void>();
      const onSubmit = vi.fn().mockImplementation(() => deferred.promise);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();

      // Resolve and check loading state is cleared
      deferred.resolve();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /creating/i })).not.toBeInTheDocument();
      });
    });

    it('should disable input and buttons during submission', async () => {
      const user = userEvent.setup();
      const deferred = createDeferredPromise<void>();
      const onSubmit = vi.fn().mockImplementation(() => deferred.promise);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      // Input and cancel button should be disabled during submission
      expect(input).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      deferred.resolve();
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when submission fails', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Band name already exists'));
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Band name already exists')).toBeInTheDocument();
      });
    });

    it('should show generic error message when submission fails without error message', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue('unknown error');
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create band')).toBeInTheDocument();
      });
    });

    it('should not call onClose when submission fails', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Error'));
      const onClose = vi.fn();
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('cancel behavior', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CreateBandDialog {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close dialog when submitting', async () => {
      const user = userEvent.setup();
      const deferred = createDeferredPromise<void>();
      const onSubmit = vi.fn().mockImplementation(() => deferred.promise);
      const onClose = vi.fn();
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      // Try to close via cancel during submission
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // onClose should not be called because dialog should prevent closing during submission
      // Note: Cancel button is disabled during submission, so this click should be ignored
      expect(onClose).not.toHaveBeenCalled();

      deferred.resolve();
    });
  });

  describe('keyboard interaction', () => {
    it('should submit form when pressing Enter in input field', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test Band{enter}');

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('Test Band');
      });
    });

    it('should not submit when pressing Enter with empty input', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, '{enter}');

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('character validation', () => {
    it('should show error for invalid characters', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, 'Test<script>');

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Band name contains invalid characters')).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should allow valid special characters', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateBandDialog {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByLabelText(/band name/i);
      await user.type(input, "The Band's #1 Hit!");

      const submitButton = screen.getByRole('button', { name: /create band/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith("The Band's #1 Hit!");
      });
    });
  });

  describe('displayName', () => {
    it('should have displayName set', () => {
      expect(CreateBandDialog.displayName).toBe('CreateBandDialog');
    });
  });
});
