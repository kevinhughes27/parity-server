import Dexie, { type EntityTable } from 'dexie';
import { type Point } from '../../api';

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
// When schema changes, we simply clear all data since local data isn't important after submission
db.version(3)
  .stores({
    games:
      '++localId, league_id, week, homeTeam, homeTeamId, awayTeam, awayTeamId, status, lastModified, homePossession, firstActor, pointsAtHalf, *undoStack',
  })
  .upgrade(tx => {
    // Clear all existing data on schema changes - local data isn't important after submission
    return tx.table('games').clear();
  });

export { db };
