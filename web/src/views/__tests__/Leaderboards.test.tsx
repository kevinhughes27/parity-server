import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboards from '../Leaderboards';
import { Stats } from '../../api';

describe('Leaderboards', () => {
  const mockStats: Stats = {
    'Player 1': {
      name: 'Player 1',
      team: 'Team A',
      goals: 5,
      assists: 3,
      second_assists: 2,
      callahan: 1,
      catches: 10,
      completions: 8,
      d_blocks: 4,
      throw_aways: 2,
      threw_drops: 1,
      o_points_for: 10,
      o_points_against: 5,
      d_points_for: 8,
      d_points_against: 4,
      pay: 1000,
      salary_per_point: 100,
    },
    'Player 2': {
      name: 'Player 2',
      team: 'Team B',
      goals: 3,
      assists: 5,
      second_assists: 1,
      callahan: 0,
      catches: 8,
      completions: 6,
      d_blocks: 2,
      throw_aways: 3,
      threw_drops: 2,
      o_points_for: 8,
      o_points_against: 6,
      d_points_for: 6,
      d_points_against: 5,
      pay: 2000,
      salary_per_point: 200,
    },
    'Player 3': {
      name: 'Player 3',
      team: 'Team A',
      goals: 4,
      assists: 4,
      second_assists: 3,
      callahan: 0,
      catches: 12,
      completions: 10,
      d_blocks: 3,
      throw_aways: 1,
      threw_drops: 1,
      o_points_for: 9,
      o_points_against: 4,
      d_points_for: 7,
      d_points_against: 3,
      pay: 1500,
      salary_per_point: 150,
    },
  };

  it('renders money stats with proper formatting', () => {
    render(<Leaderboards stats={mockStats} />);
    
    // Check for money stat titles
    expect(screen.getByText('Pay')).toBeInTheDocument();
    expect(screen.getByText('Salary per point')).toBeInTheDocument();
    
    // Check for formatted money values
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('renders number stats with proper sorting', () => {
    render(<Leaderboards stats={mockStats} />);
    
    // Check for number stat titles
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Assists')).toBeInTheDocument();
    
    // Find the Goals table and check its values
    const goalsTable = screen.getByText('Goals').closest('div')?.querySelector('table');
    const goalsValues = Array.from(goalsTable?.querySelectorAll('td:nth-child(2)') || [])
      .map(cell => cell.textContent);
    
    expect(goalsValues[0]).toBe('5'); // Player 1 should be first
    expect(goalsValues[1]).toBe('4'); // Player 3 should be second
    expect(goalsValues[2]).toBe('3'); // Player 2 should be third
  });

  it('handles zero values correctly', () => {
    const statsWithZeros: Stats = {
      'Player 1': {
        ...mockStats['Player 1'],
        callahan: 0,
      },
      'Player 2': {
        ...mockStats['Player 2'],
        callahan: 0,
      },
    };

    render(<Leaderboards stats={statsWithZeros} />);
    
    // The callahan stat should not be rendered since all values are zero
    expect(screen.queryByText('Callahan')).not.toBeInTheDocument();
  });

  it('renders all stat types', () => {
    render(<Leaderboards stats={mockStats} />);
    
    // Check for all stat types
    expect(screen.getByText('Pay')).toBeInTheDocument();
    expect(screen.getByText('Salary per point')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Assists')).toBeInTheDocument();
    expect(screen.getByText('Second assists')).toBeInTheDocument();
    expect(screen.getByText('Callahan')).toBeInTheDocument();
    expect(screen.getByText('Catches')).toBeInTheDocument();
    expect(screen.getByText('Completions')).toBeInTheDocument();
    expect(screen.getByText('D blocks')).toBeInTheDocument();
    expect(screen.getByText('Throw aways')).toBeInTheDocument();
  });
}); 