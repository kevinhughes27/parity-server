import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamDashboard from '../TeamDashboard';

// Mock local-storage
vi.mock('local-storage', () => ({
  get: vi.fn().mockReturnValue('Red'),
  set: vi.fn()
}));

describe('TeamDashboard', () => {
  const mockWeeks = [1, 2, 3];
  const mockPlayers = [
    { name: 'Alice', team: 'Red', salary: 1000 },
    { name: 'Bob', team: 'Red', salary: 2000 },
    { name: 'Charlie', team: 'Blue', salary: 1500 }
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
  });
});
