import Dexie, { type EntityTable } from 'dexie';
// probably would be better and simpler to use the PointModel here
import { type Point } from '../../api';

export interface StoredGame {
  localId?: number; // Primary key, auto-incrementing. Optional because it's set by Dexie

  league_id: string;
  week: number;
  homeTeam: string; // This is homeTeamName
  homeTeamId: number;
  homeScore: number;
  homeRoster: string[];
  awayTeam: string; // This is awayTeamName
  awayTeamId: number;
  awayScore: number;
  awayRoster: string[];
  points: Point[];

  status: 'new' | 'in-progress' | 'submitted' | 'sync-error' | 'uploaded';
  lastModified: Date;

  bookkeeperState?: any; // Internal bookkeeper state
  mementos?: any[]; // Internal memento data
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
    '++localId, league_id, week, homeTeam, homeTeamId, awayTeam, awayTeamId, status, lastModified, bookkeeperState, *mementos',
});

export { db };
