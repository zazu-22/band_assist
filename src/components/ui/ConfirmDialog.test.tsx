import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render content when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('renders with default button labels', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders with custom button labels', () => {
      render(
        <ConfirmDialog {...defaultProps} confirmLabel="Delete Forever" cancelLabel="Keep It" />
      );
      expect(screen.getByRole('button', { name: 'Delete Forever' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep It' })).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('renders with info variant (default)', () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('renders with danger variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('renders with warning variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="warning" />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(onCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onCancel when ESC key is pressed', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onCancel).toHaveBeenCalled();
      });
    });
  });

  describe('content', () => {
    it('displays title correctly', () => {
      render(<ConfirmDialog {...defaultProps} title="Delete Song" />);
      expect(screen.getByText('Delete Song')).toBeInTheDocument();
    });

    it('displays message correctly', () => {
      render(<ConfirmDialog {...defaultProps} message="This action cannot be undone." />);
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('handles long title', () => {
      const longTitle = 'This is a very long title that should still be displayed correctly';
      render(<ConfirmDialog {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles long message', () => {
      const longMessage =
        'This is a very long message that provides detailed information about the action being confirmed. It should wrap correctly and not break the layout.';
      render(<ConfirmDialog {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(ConfirmDialog.displayName).toBe('ConfirmDialog');
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA roles', () => {
      render(<ConfirmDialog {...defaultProps} />);
      // AlertDialog should have alertdialog role
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('title is properly associated', () => {
      render(<ConfirmDialog {...defaultProps} title="Delete Item" />);
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('description is properly associated', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });
});
