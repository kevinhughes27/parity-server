// Data shapes shared by the React app and the Worker.
// Field names match the v2 API so existing clients keep working.

export type EventType = 'PULL' | 'PASS' | 'POINT' | 'DEFENSE' | 'THROWAWAY' | 'DROP';

export interface PointEvent {
  type: EventType | string;
  firstActor: string;
  secondActor?: string | null;
  timestamp: string;
}

export interface Point {
  offensePlayers: string[];
  defensePlayers: string[];
  events: PointEvent[];
}

export type GameStatus = 'live' | 'final';

// A game as stored (one row / JSON doc per game) and returned by the API.
export interface Game {
  id: string;
  league_id: number;
  status: GameStatus;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeRoster: string[];
  awayRoster: string[];
  homeScore: number;
  awayScore: number;
  points: Point[];
}

export interface TeamPlayer {
  name: string;
  is_open: boolean;
}

export interface Team {
  id: number;
  name: string;
  players: TeamPlayer[];
}

export interface Matchup {
  id: number;
  week: number;
  homeTeamId: number;
  awayTeamId: number;
  gameStart: string; // local league time, ISO without offset e.g. 2026-03-15T18:00:00
  gameEnd: string;
}

export type StatValues = 'v1' | 'v2';
export type SalaryCalc = 'pro_rate' | 'sum' | string;

export interface League {
  id: number;
  name: string;
  lineSize: number;
  statValues: StatValues;
  salaryCalc: SalaryCalc;
  zuluruId: number | null;
}

// Everything a league holds. Returned by /export, accepted by /import.
export interface LeagueExport {
  version: 1;
  league: League;
  teams: Team[];
  matchups: Matchup[];
  games: Game[];
}
