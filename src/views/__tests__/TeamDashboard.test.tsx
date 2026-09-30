import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamDashboard from '../TeamDashboard';

vi.mock('local-storage', () => ({
  get: vi.fn().mockReturnValue('Red'),
  set: vi.fn(),
}));

describe('TeamDashboard', () => {
  const mockWeeks = [1, 2, 3];
  const mockPlayers = [
    { name: 'Alice', team: 'Red', salary: 1000 },
    { name: 'Bob', team: 'Red', salary: 2000 },
    { name: 'Charlie', team: 'Blue', salary: 1500 },
  ];

  it('renders TeamDashboard with correct team salary and components', () => {
    render(<TeamDashboard weeks={mockWeeks} players={mockPlayers} />);

    // Verify TeamPicker is rendered
    expect(screen.getByText('Red')).toBeInTheDocument();

    // Verify TeamTable is rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Verify default tab (Bar Chart) is rendered
    expect(screen.getByText('Bar Chart')).toBeInTheDocument();

    // Verify team salary is calculated correctly
    expect(screen.getByText('$3,000')).toBeInTheDocument(); // 1000 + 2000

    // Click through all tabs and verify their content

    // Click Pie Chart tab
    fireEvent.click(screen.getByText('Pie Chart'));
    expect(screen.getByText('Pie Chart')).toBeInTheDocument();

    // Verify pie chart is rendered (it should contain the player names)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Click League Chart tab
    fireEvent.click(screen.getByText('League Chart'));
    expect(screen.getByText('League Chart')).toBeInTheDocument();

    // Verify canvas element is rendered for the chart
    expect(document.querySelector('canvas')).toBeInTheDocument();

    // Click Trades tab
    fireEvent.click(screen.getByText('Trades'));
    expect(screen.getByText('Trades')).toBeInTheDocument();

    // Verify trades section is rendered
    expect(screen.getByText('Click on a player to make a trade.')).toBeInTheDocument();
  });
});
