import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ComparePlayers from '../ComparePlayers';
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

describe('ComparePlayers', () => {
  it('renders without crashing and shows player names in Autocomplete', () => {
    render(<ComparePlayers stats={mockStats} />);
    // Check that both player names are present as Autocomplete values
    expect(screen.getAllByDisplayValue('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Bob').length).toBeGreaterThan(0);
  });
});
