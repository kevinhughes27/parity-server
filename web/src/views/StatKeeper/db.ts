import Dexie, { type EntityTable } from 'dexie';
import { type Point, type PointEvent as ApiPointEvent } from '../../api'; // Point here is the API's Point
import { type SerializedMemento, type BookkeeperVolatileState, EventType, Event as ModelEvent } from './models';

// Define the structure of the game object to be stored in Dexie
export interface StoredGame {
  localId?: number; // Primary key, auto-incrementing. Optional because it's set by Dexie on add.
  serverId?: string; // Game ID from the server, if uploaded. Optional.

  // Core game data, similar to api.ts Game interface
  league_id: string;
  week: number;
  homeTeam: string; // This is homeTeamName
  homeTeamId?: number; // Added homeTeamId
  homeScore: number; // This will be derived from bookkeeperState.homeScore
  homeRoster: string[]; // This will be derived from bookkeeperState.homeParticipants
  awayTeam: string; // This is awayTeamName
  awayTeamId?: number; // Added awayTeamId
  awayScore: number; // This will be derived from bookkeeperState.awayScore
  awayRoster: string[]; // This will be derived from bookkeeperState.awayParticipants
  points: Point[]; // Storing points in the API format (PointEvent.type is string)

  // Local metadata
  status: 'new' | 'in-progress' | 'paused' | 'completed' | 'submitted' | 'sync-error' | 'uploaded'; // Added 'uploaded'
  lastModified: Date;

  // Extended state for Bookkeeper
  bookkeeperState?: BookkeeperVolatileState; // Contains activePoint (with enum types), firstActor, scores, etc.
                                          // Note: activePoint within bookkeeperState will store events with EventType enum.
                                          // When saving to StoredGame, this needs conversion if StoredGame.bookkeeperState.activePoint
                                          // is expected to have string event types. For simplicity, we'll store BookkeeperVolatileState
                                          // as is, and handle conversion during hydration/serialization for StoredGame.points.
  mementos?: SerializedMemento[];
}

// Create a Dexie database instance
const db = new Dexie('StatKeeperDB') as Dexie & {
  games: EntityTable<
    StoredGame,
    'localId' // Primary key "localId"
  >;
};

// Define the database schema and versioning
db.version(1).stores({
  games: '++localId, serverId, league_id, week, status, lastModified',
});

db.version(2)
  .stores({
    games: '++localId, serverId, league_id, week, status, lastModified, *mementos, bookkeeperState',
  })
  .upgrade(tx => {
    return tx
      .table('games')
      .toCollection()
      .modify(game => {
        if (game.mementos === undefined) {
          game.mementos = [];
        }
        // bookkeeperState can remain undefined for old games; Bookkeeper handles initialization.
      });
  });

db.version(3)
  .stores({
    // Added homeTeamId, awayTeamId to the index for potential future queries, though not strictly necessary for current functionality.
    games: '++localId, serverId, league_id, week, homeTeamId, awayTeamId, status, lastModified, *mementos, bookkeeperState',
  })
  .upgrade(tx => {
    return tx
      .table('games')
      .toCollection()
      .modify(game => {
        // homeTeamId and awayTeamId will be undefined for games created before this version.
        // This is fine as they are optional in the StoredGame interface.
        // New games (via NewGame.tsx) will populate them.
        // Bookkeeper initialization in LocalGame.tsx will need to handle potentially undefined team IDs
        // for older games if they are loaded (though NewGame.tsx is the primary path for new stat-taking).
        if (game.homeTeamId === undefined) {
          game.homeTeamId = undefined;
        }
        if (game.awayTeamId === undefined) {
          game.awayTeamId = undefined;
        }
      });
  });

export { db };

// Helper function to convert API PointEvent (string type) to Model Event (enum type)
export function mapApiPointEventToModelEvent(apiEvent: ApiPointEvent): ModelEvent {
  const eventTypeString = apiEvent.type.toUpperCase();
  const eventType = EventType[eventTypeString as keyof typeof EventType];

  if (!eventType) {
    // console.warn(`Unknown API event type string: ${apiEvent.type}`);
    // Fallback or throw error. For robustness, throwing an error might be better
    // to catch data inconsistencies early.
    throw new Error(`Unknown API event type string encountered: ${apiEvent.type}`);
  }

  return {
    type: eventType,
    firstActor: apiEvent.firstActor,
    secondActor: apiEvent.secondActor === '' ? null : apiEvent.secondActor, // API might use empty string for null
    timestamp: apiEvent.timestamp,
  };
}

// Helper function to convert Model Event (enum type) to API PointEvent (string type)
export function mapModelEventToApiPointEvent(modelEvent: ModelEvent): ApiPointEvent {
  return {
    type: modelEvent.type.toString(), // Converts enum to string e.g. EventType.PASS -> "PASS"
    firstActor: modelEvent.firstActor,
    secondActor: modelEvent.secondActor || '', // API expects string, ensure not null/undefined
    timestamp: modelEvent.timestamp,
  };
}
