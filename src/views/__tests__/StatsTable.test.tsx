import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsTable from '../StatsTable';
import { Stats } from '../../api';

const mockStats: Stats = {
  Alice: {
    name: 'Alice',
    team: 'Red',
    goals: 7,
    assists: 2,
    second_assists: 1,
    callahan: 0,
    catches: 15,
    completions: 12,
    d_blocks: 3,
    throw_aways: 1,
    threw_drops: 0,
    o_points_for: 8,
    o_points_against: 2,
    d_points_for: 5,
    d_points_against: 3,
    pay: 1200,
    salary_per_point: 120,
  },
  Bob: {
    name: 'Bob',
    team: 'Blue',
    goals: 4,
    assists: 5,
    second_assists: 2,
    callahan: 1,
    catches: 10,
    completions: 8,
    d_blocks: 2,
    throw_aways: 2,
    threw_drops: 1,
    o_points_for: 6,
    o_points_against: 4,
    d_points_for: 4,
    d_points_against: 4,
    pay: 900,
    salary_per_point: 90,
  },
};

describe('StatsTable', () => {
  it('renders player stats in a table', () => {
    render(<StatsTable stats={mockStats} />);

    // Check for player names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Check for teams
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();

    // Check for goals
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    // Check for pay as currency
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByText('$900')).toBeInTheDocument();
  });
});
