import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GamesList from '../GamesList';
import * as leagueHook from '../../hooks/league';
import * as api from '../../api';
import type { Game, Stats } from '../../api';

vi.mock('../../hooks/league');
vi.mock('../../api', () => ({
  fetchGames: vi.fn().mockResolvedValue([]),
  leagues: [
    { id: 22, name: 'Test League' },
    { id: 23, name: 'Other League' },
  ],
}));

describe('GamesList', () => {
  const mockGames: Game[] = [
    {
      id: '1',
      league_id: '22',
      week: 1,
      homeTeam: 'Red',
      awayTeam: 'Blue',
      homeScore: 10,
      awayScore: 8,
      homeRoster: ['player1'],
      awayRoster: ['player2'],
      points: [],
      stats: {} as Stats,
    },
    {
      id: '2',
      league_id: '22',
      week: 2,
      homeTeam: 'Red',
      awayTeam: 'Yellow',
      homeScore: 12,
      awayScore: 10,
      homeRoster: ['player1'],
      awayRoster: ['player3'],
      points: [],
      stats: {} as Stats,
    },
  ];

  beforeEach(() => {
    vi.mocked(leagueHook.useLeague).mockReturnValue(['22', vi.fn()]);
    vi.mocked(api.fetchGames).mockResolvedValue(mockGames);
  });

  it('renders GamesList with games grouped by week', async () => {
    render(
      <MemoryRouter>
        <GamesList />
      </MemoryRouter>
    );

    // Verify loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for games to load
    await screen.findByText('Week 1');

    // Verify LeaguePicker is rendered
    expect(screen.getByText('Test League')).toBeInTheDocument();

    // Verify games are rendered
    expect(screen.getByText(/Red vs Blue/)).toBeInTheDocument();
    expect(screen.getByText(/Red vs Yellow/)).toBeInTheDocument();
    expect(screen.getByText('10 - 8')).toBeInTheDocument();
    expect(screen.getByText('12 - 10')).toBeInTheDocument();
  });
});
