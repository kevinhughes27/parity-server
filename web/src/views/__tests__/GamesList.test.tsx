import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GamesList from '../GamesList';
import * as leagueHook from '../../hooks/league';
import * as api from '../../api';

vi.mock('../../hooks/league');
vi.mock('../../api');

describe('GamesList', () => {
  const mockGames = [
    {
      id: '1',
      league_id: '22',
      week: 1,
      homeTeam: 'Red',
      awayTeam: 'Blue',
      homeScore: 10,
      awayScore: 8,
      homeRoster: ['player1'] as [string],
      awayRoster: ['player2'] as [string],
      points: [],
      stats: {} as Record<string, any>
    },
    {
      id: '2',
      league_id: '22',
      week: 2,
      homeTeam: 'Red',
      awayTeam: 'Yellow',
      homeScore: 12,
      awayScore: 10,
      homeRoster: ['player1'] as [string],
      awayRoster: ['player3'] as [string],
      points: [],
      stats: {} as Record<string, any>
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leagueHook.useLeague).mockReturnValue(['22', vi.fn()]);
    vi.mocked(api.fetchGames).mockResolvedValue(mockGames);
    // Mock leagues as a property of the api module
    Object.defineProperty(api, 'leagues', {
      value: [
        { id: '22', name: 'Test League' },
        { id: '23', name: 'Another League' },
      ]
    });
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