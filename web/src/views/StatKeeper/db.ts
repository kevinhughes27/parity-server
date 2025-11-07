import Dexie, { type EntityTable } from 'dexie';
import { type Point } from '../../api';

// prettier-ignore
export type GameView =
  | 'selectLines'
  | 'recordStats'
  | 'editRosters'
  | 'error_state';

type UndoCommandType =
  | 'recordFirstActor'
  | 'recordPull'
  | 'recordPass'
  | 'recordDrop'
  | 'recordThrowAway'
  | 'recordD'
  | 'recordCatchD'
  | 'recordPoint'
  | 'recordHalf';

export interface UndoCommand {
  type: UndoCommandType;
  timestamp: string;
  data?: any; // minimal data only when we can't infer
}

export interface StoredPlayer {
  name: string;
  is_open: boolean;
}

export interface StoredGame {
  localId?: number; // Primary key, auto-incrementing. Optional because it's set by Dexie
  league_id: number;
  week: number;

  // homeTeam
  homeTeam: string; // This is homeTeamName
  homeTeamId: number;
  homeRoster: StoredPlayer[];

  // awayTeam
  awayTeam: string; // This is awayTeamName
  awayTeamId: number;
  awayRoster: StoredPlayer[];

  // Game state
  points: Point[];
  activePoint: Point | null;
  homeScore: number;
  awayScore: number;
  homePossession: boolean;
  firstActor: string | null;
  pointsAtHalf: number;

  // Line selection state
  homePlayers: string[] | null;
  awayPlayers: string[] | null;
  lastPlayedLine: { home: string[]; away: string[] } | null;

  // UI state
  localError: string | null;
  isEditingLines: boolean;
  isEditingRosters: boolean;

  // Undo system
  undoStack: UndoCommand[];

  // Persistence metadata
  status: 'in-progress' | 'submitted' | 'sync-error' | 'uploaded';
  lastModified: Date;
}

const db = new Dexie('StatKeeperDB') as Dexie & {
  games: EntityTable<
    StoredGame,
    'localId' // Primary key "localId"
  >;
};

// Define the database schema and versioning
db.version(1).stores({
  games:
    '++localId, league_id, week, homeTeam, homeTeamId, awayTeam, awayTeamId, status, lastModified, homePossession, firstActor, pointsAtHalf, isEditingLines, isEditingRosters, *undoStack',
});

// Migration for v2 - handle the roster format change
db.version(2).stores({
  games:
    '++localId, league_id, week, homeTeam, homeTeamId, awayTeam, awayTeamId, status, lastModified, homePossession, firstActor, pointsAtHalf, isEditingLines, isEditingRosters, *undoStack',
}).upgrade(tx => {
  // Migration: Convert string rosters to player objects
  return tx.table('games').toCollection().modify(game => {
    if (game.homeRoster && typeof game.homeRoster[0] === 'string') {
      game.homeRoster = game.homeRoster.map((name: string) => ({ name, is_open: true }));
    }
    if (game.awayRoster && typeof game.awayRoster[0] === 'string') {
      game.awayRoster = game.awayRoster.map((name: string) => ({ name, is_open: true }));
    }
  });
});

export { db };
