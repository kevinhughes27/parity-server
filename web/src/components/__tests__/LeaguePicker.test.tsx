import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeaguePicker from '../LeaguePicker';

vi.mock('../../api', () => ({
  leagues: [
    { id: 1, name: 'League One' },
    { id: 2, name: 'League Two' },
  ],
}));

vi.mock('../../hooks/league', () => ({
  useLeague: () => ['1', vi.fn()],
}));

describe('LeaguePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders league options in desktop mode', () => {
    render(<LeaguePicker mobile={false} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    fireEvent.mouseDown(select);
    expect(screen.getAllByText('League One').length).toBeGreaterThan(0);
    expect(screen.getByText('League Two')).toBeInTheDocument();
  });

  it('renders league options in mobile mode', () => {
    render(<LeaguePicker mobile={true} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    fireEvent.mouseDown(select);
    expect(screen.getAllByText('League One').length).toBeGreaterThan(0);
    expect(screen.getByText('League Two')).toBeInTheDocument();
  });

  it('calls onChange when a league is selected', () => {
    const onChange = vi.fn();
    render(<LeaguePicker mobile={false} onChange={onChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);
    const league2 = screen.getByText('League Two');
    fireEvent.click(league2);
    expect(onChange).toHaveBeenCalledWith(2);
  });
}); 