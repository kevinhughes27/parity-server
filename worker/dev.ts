// Development only (`./dev up`), none of this is in production builds.
//
// The dev league (see shared/leagues.ts) is the only league on your machine. It
// fills itself with made up teams, a schedule and a couple of games the first
// time it is used. Delete .wrangler/state to start over.
//
// The real leagues are read from production so there is real data to look at.
// Anything else (writes) stays local so dev can't change production.

import { devLeague } from '../shared/leagues';
import type { Game, LeagueExport, Matchup, Team } from '../shared/types';
import rosters from '../shared/fixtures/rosters.json';
import miniGame from '../shared/fixtures/mini_game.json';
import miniGame2 from '../shared/fixtures/mini_game2.json';
import type { LeagueObject } from './league';

export const PRODUCTION = 'https://parity.ocua.ca';

export function fromProduction(request: Request) {
  const url = new URL(request.url);
  return fetch(PRODUCTION + url.pathname + url.search);
}

export async function seedDevLeague(league: DurableObjectStub<LeagueObject>) {
  if ((await league.teams()).length > 0) return;
  await league.import(devLeagueData());
}

function devLeagueData(): LeagueExport {
  // 8 open and 4 women per team
  const teams: Team[] = Object.entries(rosters).map(([name, players], i) => ({
    id: i + 1,
    name,
    players: players.map((player, j) => ({ name: player, is_open: j % 3 !== 2 })),
  }));

  // two games a week for the next four weeks (teams 1v2 and 3v4, then 1v3 and 2v4...)
  const pairings = [
    [1, 2, 3, 4],
    [1, 3, 2, 4],
    [1, 4, 2, 3],
  ];
  const matchups: Matchup[] = [];
  for (let week = 2; week <= 5; week++) {
    const [a, b, c, d] = pairings[week % pairings.length];
    const day = new Date(Date.now() + (week - 1) * 7 * 86400_000).toISOString().slice(0, 10);
    for (const [home, away, time] of [
      [a, b, '19:00'],
      [c, d, '20:30'],
    ] as const) {
      matchups.push({
        id: matchups.length + 1,
        week,
        homeTeamId: home,
        awayTeamId: away,
        gameStart: `${day}T${time}:00`,
        gameEnd: `${day}T${time === '19:00' ? '20:30' : '22:00'}:00`,
      });
    }
  }

  // week 1 was played (games from the stat keeper tests)
  const games: Game[] = [miniGame, miniGame2].map((game, i) => ({
    ...game,
    id: `dev-${i + 1}`,
    league_id: devLeague.id,
    status: 'final',
    homeScore: Number(game.homeScore),
    awayScore: Number(game.awayScore),
  }));

  return { version: 1, league: devLeague, teams, matchups, games };
}
