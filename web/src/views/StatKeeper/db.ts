import Dexie, { type EntityTable } from 'dexie';
import { type Point } from '../../api'; // Point here is the API's Point, not PointModel
import { type SerializedMemento, type BookkeeperVolatileState } from '../../../statkeeper_lib/models'; // Adjust path as needed

// Define the structure of the game object to be stored in Dexie
export interface StoredGame {
  localId?: number;       // Primary key, auto-incrementing. Optional because it's set by Dexie on add.
  serverId?: string;      // Game ID from the server, if uploaded. Optional.

  // Core game data, similar to api.ts Game interface
  league_id: number;
  week: number;
  homeTeam: string; // This is homeTeamName
  homeScore: number; // This will be derived from bookkeeperState.homeScore
  homeRoster: string[]; // This will be derived from bookkeeperState.homeParticipants
  awayTeam: string; // This is awayTeamName
  awayScore: number; // This will be derived from bookkeeperState.awayScore
  awayRoster: string[]; // This will be derived from bookkeeperState.awayParticipants
  points: Point[]; // Storing points in the API format

  // Local metadata
  status: 'new' | 'in-progress' | 'paused' | 'completed' | 'submitted' | 'sync-error';
  lastModified: Date;

  // Extended state for Bookkeeper
  bookkeeperState?: BookkeeperVolatileState; // Contains activePoint, firstActor, scores, etc.
  mementos?: SerializedMemento[];
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
// Version 2: Added bookkeeperState and mementos
db.version(1).stores({
  games: '++localId, serverId, league_id, week, status, lastModified',
});

db.version(2).stores({
    games: '++localId, serverId, league_id, week, status, lastModified, *mementos, bookkeeperState',
}).upgrade(tx => {
  // Migration logic for existing data if needed.
  // For new fields being optional, direct upgrade might be fine.
  // If they must exist, iterate and add default values.
  return tx.table('games').toCollection().modify(game => {
    if (game.mementos === undefined) {
      game.mementos = [];
    }
    if (game.bookkeeperState === undefined) {
      // Initialize with sensible defaults if possible, or leave as potentially undefined
      // if Bookkeeper handles it. For now, let's assume Bookkeeper can start fresh
      // if this is missing for very old games.
    }
  });
});


export { db };
