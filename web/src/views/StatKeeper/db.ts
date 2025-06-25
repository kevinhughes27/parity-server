import Dexie, { type EntityTable } from 'dexie';
// probably would be better and simpler to use the PointModel here
import { type Point } from '../../api';

// Types for game state
export type GameView = 'selectLines' | 'recordStats' | 'editRosters' | 'error_state';

export interface UndoCommand {
  type: 'recordFirstActor' | 'recordPull' | 'recordPass' | 'recordDrop' | 'recordThrowAway' |
        'recordD' | 'recordCatchD' | 'recordPoint' | 'recordHalf';
  timestamp: string;
  data?: any; // Minimal data only when we can't infer
}

export interface StoredGame {
  localId?: number; // Primary key, auto-incrementing. Optional because it's set by Dexie

  // Basic game identity
  league_id: string;
  week: number;
  homeTeam: string; // This is homeTeamName
  homeTeamId: number;
  awayTeam: string; // This is awayTeamName
  awayTeamId: number;
  homeRoster: string[];
  awayRoster: string[];

  // Game state - moved from Bookkeeper
  points: Point[];
  activePoint: Point | null;
  homeScore: number;
  awayScore: number;
  homePossession: boolean;
  firstActor: string | null;
  pointsAtHalf: number;

  // Line selection state - moved from Bookkeeper
  homePlayers: string[] | null;
  awayPlayers: string[] | null;
  lastPlayedLine: { home: string[]; away: string[] } | null;

  // UI state - moved from Bookkeeper
  currentView: GameView;
  localError: string | null;

  // Undo system - moved from Bookkeeper
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
    '++localId, league_id, week, homeTeam, homeTeamId, awayTeam, awayTeamId, status, lastModified, currentView, homePossession, firstActor, pointsAtHalf, *undoStack',
});

export { db };
