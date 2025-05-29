import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useMediaQuery before importing StatsFilters
vi.mock('react-responsive', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('../LeaguePicker', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="league-picker" {...props}>LeaguePicker</div>,
}));

vi.mock('../WeekPicker', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="week-picker" onClick={() => props.onChange && props.onChange(2)} {...props}>
      WeekPicker
    </div>
  ),
}));

import StatsFilters from '../StatsFilters';
import { useMediaQuery } from 'react-responsive';

describe('StatsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders desktop filters', () => {
    (useMediaQuery as any).mockReturnValue(false);
    const changeWeek = vi.fn();
    render(
      <StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />
    );
    expect(screen.getByTestId('league-picker')).toBeInTheDocument();
    expect(screen.getByTestId('week-picker')).toBeInTheDocument();
  });

  it('renders mobile filters and handles dialog', () => {
    (useMediaQuery as any).mockReturnValue(true);
    const changeWeek = vi.fn();
    render(
      <StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />
    );
    // Open the dialog
    const filterButton = screen.getByRole('button');
    fireEvent.click(filterButton);
    // WeekPicker should be in the dialog
    expect(screen.getByTestId('week-picker')).toBeInTheDocument();
    // Simulate week change
    fireEvent.click(screen.getByTestId('week-picker'));
    expect(changeWeek).toHaveBeenCalledWith(2);
  });
}); 