import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { useMediaQuery } from 'react-responsive';

vi.mock('../../hooks/league', () => ({
  useLeague: () => ['1', vi.fn()],
}));

vi.mock('../../api', () => ({
  leagues: [
    { id: 1, name: 'League One' },
    { id: 2, name: 'League Two' },
  ],
}));

// Mock useMediaQuery before importing StatsFilters
vi.mock('react-responsive', () => ({
  useMediaQuery: vi.fn(),
}));

import StatsFilters from '../StatsFilters';

describe('StatsFilters', () => {
  it('renders desktop filters directly in the layout', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const changeWeek = vi.fn();

    render(<StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />);

    // There should be two comboboxes: [0] League, [1] Week
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBe(2);
    expect(screen.getByText('League One')).toBeInTheDocument();

    // Week change should work
    fireEvent.mouseDown(comboboxes[1]);
    fireEvent.click(screen.getByText('Week 2'));
    expect(changeWeek).toHaveBeenCalledWith(2);
  });

  it('renders mobile filters in a dialog', async () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const changeWeek = vi.fn();

    render(<StatsFilters data={{ week: 1, weeks: [1, 2, 3] }} changeWeek={changeWeek} />);

    // Initially only the filter button should be visible
    const filterButton = screen.getByRole('button');
    expect(filterButton).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    // Open the dialog
    fireEvent.click(filterButton);

    // Now the filters should be visible in the dialog
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBe(2);
    expect(screen.getByText('League One')).toBeInTheDocument();

    // Week change should work and close the dialog
    fireEvent.mouseDown(comboboxes[1]);
    fireEvent.click(screen.getByText('Week 2'));
    expect(changeWeek).toHaveBeenCalledWith(2);

    // The dialog should close, so comboboxes should be gone
    await waitForElementToBeRemoved(() => screen.queryAllByRole('combobox'));
  });
});
