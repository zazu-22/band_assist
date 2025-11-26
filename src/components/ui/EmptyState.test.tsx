import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Music, Plus, Search } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  const defaultProps = {
    icon: Music,
    title: 'No songs yet',
    description: 'Add your first song to get started.',
  };

  describe('rendering', () => {
    it('renders title', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('No songs yet')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByText('Add your first song to get started.')).toBeInTheDocument();
    });

    it('renders icon with aria-hidden', () => {
      render(<EmptyState {...defaultProps} />);
      const iconContainer = document.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <EmptyState {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders with dashed border style', () => {
      const { container } = render(<EmptyState {...defaultProps} />);
      expect(container.firstChild).toHaveClass('border-dashed');
    });
  });

  describe('action button', () => {
    it('renders action button when action prop provided', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{ label: 'Add Song', onClick: handleClick }}
        />
      );
      expect(screen.getByRole('button', { name: 'Add Song' })).toBeInTheDocument();
    });

    it('does not render action button when action prop not provided', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onClick when action button clicked', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{ label: 'Add Song', onClick: handleClick }}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add Song' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders correct button label', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          {...defaultProps}
          action={{ label: 'Create New', onClick: handleClick }}
        />
      );
      expect(screen.getByRole('button', { name: 'Create New' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyState {...defaultProps} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      render(<EmptyState {...defaultProps} />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('icon is hidden from screen readers', () => {
      render(<EmptyState {...defaultProps} />);
      const iconContainer = document.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('different icons', () => {
    it('renders with Music icon', () => {
      render(<EmptyState {...defaultProps} icon={Music} />);
      expect(screen.getByText('No songs yet')).toBeInTheDocument();
    });

    it('renders with Plus icon', () => {
      render(<EmptyState {...defaultProps} icon={Plus} title="Add Items" />);
      expect(screen.getByText('Add Items')).toBeInTheDocument();
    });

    it('renders with Search icon', () => {
      render(<EmptyState {...defaultProps} icon={Search} title="No results" />);
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });

  describe('long content', () => {
    it('handles long title', () => {
      render(
        <EmptyState
          {...defaultProps}
          title="This is a very long title that might wrap to multiple lines"
        />
      );
      expect(
        screen.getByText('This is a very long title that might wrap to multiple lines')
      ).toBeInTheDocument();
    });

    it('handles long description', () => {
      const longDescription =
        'This is a very long description that provides detailed information about the empty state and what actions the user can take to add content.';
      render(<EmptyState {...defaultProps} description={longDescription} />);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(EmptyState.displayName).toBe('EmptyState');
    });
  });
});
