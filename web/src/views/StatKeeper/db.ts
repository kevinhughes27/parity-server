import Dexie, { type EntityTable } from 'dexie';
import { type Point } from '../../api';

// Define the structure of the game object to be stored in Dexie
export interface StoredGame {
  localId?: number;       // Primary key, auto-incrementing. Optional because it's set by Dexie on add.
  serverId?: string;      // Game ID from the server, if uploaded. Optional.

  // Core game data, similar to api.ts Game interface
  league_id: string;
  week: number;
  homeTeam: string;
  homeScore: number;
  homeRoster: string[];
  awayTeam: string;
  awayScore: number;
  awayRoster: string[];
  points: Point[];

  // Local metadata
  status: 'new' | 'in-progress' | 'paused' | 'completed' | 'submitted' | 'sync-error';
  lastModified: Date;
}

// Create a Dexie database instance
// The generic type parameter defines the shape of the database schema
const db = new Dexie('StatKeeperDB') as Dexie & {
  games: EntityTable<
    StoredGame,
    'localId' // Primary key "localId" (the type of the primary key)
  >;
};

// Define the database schema and versioning
// ++localId: auto-incrementing primary key
// serverId: for mapping to server's game ID (indexed for quick lookups)
// league_id, week, status, lastModified: indexed for querying and sorting
db.version(1).stores({
  games: '++localId, serverId, league_id, week, status, lastModified',
});

export { db };
