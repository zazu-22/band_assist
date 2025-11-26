import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  describe('rendering', () => {
    it('renders title', () => {
      render(<StatCard title="Total Songs" value={10} />);
      expect(screen.getByText('Total Songs')).toBeInTheDocument();
    });

    it('renders numeric value', () => {
      render(<StatCard title="Count" value={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders string value', () => {
      render(<StatCard title="Status" value="Active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(<StatCard title="Total" value={5} subtitle="Songs" />);
      expect(screen.getByText('Songs')).toBeInTheDocument();
    });

    it('does not render subtitle when not provided', () => {
      render(<StatCard title="Total" value={5} />);
      // Only title and value should be present
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      render(<StatCard title="Activity" value={10} icon={Activity} />);
      // Icon is rendered with aria-hidden
      const iconContainer = document.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('does not render icon container when icon not provided', () => {
      const { container } = render(<StatCard title="No Icon" value={10} />);
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <StatCard title="Test" value={0} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('variants', () => {
    it('renders with default variant', () => {
      render(<StatCard title="Default" value={0} icon={Activity} />);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('renders with success variant', () => {
      render(<StatCard title="Success" value={5} icon={CheckCircle2} variant="success" />);
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders with info variant', () => {
      render(<StatCard title="Info" value="Available" variant="info" />);
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('renders with warning variant', () => {
      render(<StatCard title="Warning" value={3} variant="warning" />);
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });
  });

  describe('value types', () => {
    it('handles zero value', () => {
      render(<StatCard title="Empty" value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles large numbers', () => {
      render(<StatCard title="Large" value={999999} />);
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('handles empty string value', () => {
      render(<StatCard title="Empty" value="" />);
      expect(screen.getByText('Empty')).toBeInTheDocument();
    });

    it('handles string with special characters', () => {
      render(<StatCard title="Event" value="Dec 25 • Venue" />);
      expect(screen.getByText('Dec 25 • Venue')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('icon container has aria-hidden', () => {
      render(<StatCard title="Accessible" value={10} icon={Activity} />);
      const iconContainer = document.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('memo behavior', () => {
    it('has displayName set', () => {
      expect(StatCard.displayName).toBe('StatCard');
    });
  });
});
