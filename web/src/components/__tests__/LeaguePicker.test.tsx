import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeaguePicker from '../LeaguePicker';

vi.mock('../../hooks/league', () => ({
  useLeague: () => ['1', vi.fn()],
}));

vi.mock('../../api', () => ({
  leagues: [
    { id: 1, name: 'League One' },
    { id: 2, name: 'League Two' },
  ],
}));

describe('LeaguePicker', () => {
  it('renders league options in desktop mode', () => {
    render(<LeaguePicker mobile={false} />);

    // Check if the select element is rendered
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Open the select menu
    fireEvent.mouseDown(select);

    // Check if all league options are rendered
    expect(screen.getAllByText('League One').length).toBeGreaterThan(0);
    expect(screen.getByText('League Two')).toBeInTheDocument();
  });

  it('renders league options in mobile mode', () => {
    render(<LeaguePicker mobile={true} />);

    // Check if the select element is rendered
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Open the select menu
    fireEvent.mouseDown(select);

    // Check if all league options are rendered
    expect(screen.getAllByText('League One').length).toBeGreaterThan(0);
    expect(screen.getByText('League Two')).toBeInTheDocument();
  });

  it('calls onChange when a league is selected', () => {
    const onChange = vi.fn();
    render(<LeaguePicker mobile={false} onChange={onChange} />);

    // Check if the select element is rendered
    const select = screen.getByRole('combobox');

    // Open the select menu
    fireEvent.mouseDown(select);

    // Select a different League
    const league2 = screen.getByText('League Two');
    fireEvent.click(league2);
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
