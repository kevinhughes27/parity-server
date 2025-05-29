import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useMediaQuery before importing StatsFilters
vi.mock('react-responsive', () => ({
  useMediaQuery: vi.fn(),
}));

interface WeekPickerProps {
  mobile: boolean;
  onChange?: (week: number) => void;
  [key: string]: unknown;
}

vi.mock('../LeaguePicker', () => ({
  __esModule: true,
  default: ({ mobile, ...props }: { mobile: boolean; [key: string]: unknown }) => (
    <div data-testid="league-picker" data-mobile={mobile} {...props}>
      LeaguePicker
    </div>
  ),
}));

vi.mock('../WeekPicker', () => ({
  __esModule: true,
  default: ({ mobile, onChange, ...props }: WeekPickerProps) => (
    <button
      data-testid="week-picker"
      data-mobile={mobile}
      onClick={() => onChange?.(2)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onChange?.(2);
        }
      }}
      {...props}
    >
      WeekPicker
    </button>
  ),
}));

import StatsFilters from '../StatsFilters';
import { useMediaQuery } from 'react-responsive';

describe('StatsFilters', () => {
  it('renders desktop filters', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const changeWeek = vi.fn();

    render(<StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />);

    const leaguePicker = screen.getByTestId('league-picker');
    const weekPicker = screen.getByTestId('week-picker');
    expect(leaguePicker).toBeInTheDocument();
    expect(weekPicker).toBeInTheDocument();
    expect(leaguePicker).toHaveAttribute('data-mobile', 'false');
    expect(weekPicker).toHaveAttribute('data-mobile', 'false');
  });

  it('renders mobile filters and handles dialog', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const changeWeek = vi.fn();

    render(<StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />);

    // Open the dialog
    const filterButton = screen.getByRole('button');
    fireEvent.click(filterButton);

    // WeekPicker should be in the dialog
    const weekPicker = screen.getByTestId('week-picker');
    expect(weekPicker).toBeInTheDocument();
    expect(weekPicker).toHaveAttribute('data-mobile', 'true');

    // Simulate week change
    fireEvent.click(weekPicker);
    expect(changeWeek).toHaveBeenCalledWith(2);
  });
});
