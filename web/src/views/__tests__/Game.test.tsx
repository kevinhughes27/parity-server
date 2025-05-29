import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Game from '../Game';
import * as api from '../../api';

vi.mock('../../api');
vi.mock('../../layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Game', () => {
  const mockGame = {
    id: '1',
    league_id: '22',
    week: 1,
    homeTeam: 'Red',
    awayTeam: 'Blue',
    homeScore: 10,
    awayScore: 8,
    homeRoster: ['player1', 'player3'],
    awayRoster: ['player2', 'player4'],
    points: [
      {
        offensePlayers: ['player1', 'player3'],
        defensePlayers: ['player2', 'player4'],
        events: [
          {
            timestamp: 'Oct 26, 2017 8:51:17 PM',
            type: 'PULL',
            firstActor: 'player1',
            secondActor: '',
          },
          {
            timestamp: 'Oct 26, 2017 8:51:20 PM',
            type: 'PASS',
            firstActor: 'player1',
            secondActor: 'player3',
          },
          {
            timestamp: 'Oct 26, 2017 8:51:21 PM',
            type: 'POINT',
            firstActor: 'player3',
            secondActor: '',
          },
        ],
      },
    ],
    stats: {
      player1: {
        name: 'player1',
        team: 'Red',
        goals: 0,
        assists: 1,
        second_assists: 0,
        d_blocks: 0,
        catches: 1,
        completions: 1,
        throw_aways: 0,
        threw_drops: 0,
        o_points_for: 1,
        o_points_against: 0,
        d_points_for: 0,
        d_points_against: 0,
        pay: 0,
      },
      player3: {
        name: 'player3',
        team: 'Red',
        goals: 1,
        assists: 0,
        second_assists: 0,
        d_blocks: 0,
        catches: 1,
        completions: 0,
        throw_aways: 0,
        threw_drops: 0,
        o_points_for: 1,
        o_points_against: 0,
        d_points_for: 0,
        d_points_against: 0,
        pay: 0,
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    vi.mocked(api.fetchGame).mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={['/22/game/1']}>
        <Routes>
          <Route path="/:leagueId/game/:gameId" element={<Game />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders game details after loading', async () => {
    vi.mocked(api.fetchGame).mockResolvedValue(mockGame);
    render(
      <MemoryRouter initialEntries={['/22/game/1']}>
        <Routes>
          <Route path="/:leagueId/game/:gameId" element={<Game />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for loading to complete
    await screen.findByRole('progressbar');

    // Verify game details are rendered
    const headingElements = screen.getAllByRole('heading', { level: 5 });
    expect(headingElements).toHaveLength(3);
    expect(headingElements[0]).toHaveTextContent('Red');
    expect(headingElements[1]).toHaveTextContent('Blue');
    expect(headingElements[2]).toHaveTextContent('Points');

    // Winner gets a Star. There can be only one
    const starIcons = screen.getAllByTestId('StarIcon');
    expect(starIcons).toHaveLength(1);
  });
});
