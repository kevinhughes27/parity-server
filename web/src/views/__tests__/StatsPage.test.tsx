import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatsPage from '../StatsPage';
import * as statsHooks from '../../hooks/stats';
import * as leagueHooks from '../../hooks/league';
import { FunctionComponent } from 'react';

// Mock the hooks
vi.mock('../../hooks/stats', () => ({
  useStats: vi.fn()
}));

vi.mock('../../hooks/league', () => ({
  useLeague: vi.fn()
}));

// Mock component for StatsPage
const MockStatsComponent: FunctionComponent<any> = ({ stats }) => (
  <div>
    {Object.values(stats).map((player: any) => (
      <div key={player.name}>
        <span>{player.name}</span>
        <span>{player.team}</span>
        <span>{player.goals}</span>
      </div>
    ))}
  </div>
);

describe('StatsPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock useLeague hook to return a tuple [leagueId, setLeague]
    (leagueHooks.useLeague as any).mockReturnValue(['22', vi.fn()]);

    // Mock useStats hook
    (statsHooks.useStats as any).mockReturnValue([
      {
        weeks: [1, 2, 3],
        week: 1,
        stats: {
          'Alice': {
            name: 'Alice',
            team: 'Red',
            goals: 5,
            assists: 2,
            second_assists: 1,
            d_blocks: 3,
            catches: 10,
            completions: 20,
            throw_aways: 1,
            threw_drops: 0,
            drops: 0,
            o_points_for: 6,
            o_points_against: 2,
            d_points_for: 4,
            d_points_against: 3,
            callahan: 0,
            pay: 1000
          }
        }
      },
      true,
      vi.fn()
    ]);
  });

  it('shows loading state', () => {
    render(
      <MemoryRouter>
        <StatsPage component={MockStatsComponent} />
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows loaded state', async () => {
    // Update the mock to return loaded state
    (statsHooks.useStats as any).mockReturnValue([
      {
        weeks: [1, 2, 3],
        week: 1,
        stats: {
          'Alice': {
            name: 'Alice',
            team: 'Red',
            goals: 5,
            assists: 2,
            second_assists: 1,
            d_blocks: 3,
            catches: 10,
            completions: 20,
            throw_aways: 1,
            threw_drops: 0,
            drops: 0,
            o_points_for: 6,
            o_points_against: 2,
            d_points_for: 4,
            d_points_against: 3,
            callahan: 0,
            pay: 1000
          }
        }
      },
      false,
      vi.fn()
    ]);

    render(
      <MemoryRouter>
        <StatsPage component={MockStatsComponent} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    // Assert on rendered content
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // goals
  });
});
