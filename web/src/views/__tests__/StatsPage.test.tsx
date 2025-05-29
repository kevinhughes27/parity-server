import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatsPage from '../StatsPage';
import * as statsHooks from '../../hooks/stats';
import * as leagueHooks from '../../hooks/league';
import { FunctionComponent } from 'react';

// Mock the hooks
vi.mock('../../hooks/stats', () => ({
  useStats: vi.fn(),
}));

vi.mock('../../hooks/league', () => ({
  useLeague: vi.fn(),
}));

// Mock component for StatsPage
const MockStatsComponent: FunctionComponent<{ stats: Record<string, unknown> }> = ({ stats }) => (
  <div>
    {Object.values(stats).map(value => {
      const player = value as { name: string; team: string; goals: number };
      return (
        <div key={player.name}>
          <span>{player.name}</span>
          <span>{player.team}</span>
          <span>{player.goals}</span>
        </div>
      );
    })}
  </div>
);

describe('StatsPage', () => {
  it('renders loading state initially', () => {
    (statsHooks.useStats as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { week: 1, weeks: [1, 2, 3], stats: {} },
      true,
      vi.fn(),
    ]);
    (leagueHooks.useLeague as unknown as ReturnType<typeof vi.fn>).mockReturnValue(['22', vi.fn()]);

    render(
      <MemoryRouter>
        <StatsPage component={MockStatsComponent} />
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders stats when loaded', async () => {
    const mockStats = {
      player1: {
        name: 'Player 1',
        team: 'Red',
        goals: 5,
      },
      player2: {
        name: 'Player 2',
        team: 'Blue',
        goals: 3,
      },
    };

    (statsHooks.useStats as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { week: 1, weeks: [1, 2, 3], stats: mockStats },
      false,
      vi.fn(),
    ]);
    (leagueHooks.useLeague as unknown as ReturnType<typeof vi.fn>).mockReturnValue(['22', vi.fn()]);

    render(
      <MemoryRouter>
        <StatsPage component={MockStatsComponent} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 2')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
