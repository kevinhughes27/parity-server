import { describe, expect, beforeEach, afterAll, test } from 'vitest';
import { Bookkeeper } from '../bookkeeper';
import {
  EventType,
  League,
  Team,
  Event,
  SerializedGameData,
  BookkeeperVolatileState, // Added for explicit typing
  SerializedMemento, // Added for explicit typing
} from '../models';
import 'fake-indexeddb/auto';
import { db, StoredGame } from '../db';
import { Point as ApiPoint, PointEvent as ApiPointEvent } from '../../../api'; // For typing points stored in DB

const PLAYER1 = 'Kevin Hughes';
const PLAYER2 = 'Allan Godding';
const PLAYER3 = 'Patrick Kenzie';
const PLAYER4 = 'Player 4';

const mockLeague: League = { name: 'OCUA', id: '101', lineSize: 7 }; // Added lineSize
const mockHomeTeam: Team = { name: 'Team A', id: 1 };
const mockAwayTeam: Team = { name: 'Team B', id: 2 };
const mockWeek = 1;

const homeLine = [PLAYER1, PLAYER3, 'HP3', 'HP4', 'HP5', 'HP6', 'HP7'];
const awayLine = [PLAYER2, PLAYER4, 'AP3', 'AP4', 'AP5', 'AP6', 'AP7'];

// Helper to map Model Event (enum type) to API PointEvent (string type) for storage
function mapModelEventToApiPointEvent(modelEvent: Event): ApiPointEvent {
  return {
    type: modelEvent.type.toString(),
    firstActor: modelEvent.firstActor,
    secondActor: modelEvent.secondActor || '',
    timestamp: modelEvent.timestamp,
  };
}

// Helper to map API PointEvent (string type) to Model Event (enum type) for Bookkeeper
function mapApiPointEventToModelEvent(apiEvent: ApiPointEvent): Event {
  const eventTypeString = apiEvent.type.toUpperCase();
  const eventType = EventType[eventTypeString as keyof typeof EventType];

  if (!eventType) {
    console.warn(`Unknown event type string during test hydration: ${apiEvent.type}`);
    throw new Error(`Unknown event type string: ${apiEvent.type}`);
  }

  return {
    type: eventType,
    firstActor: apiEvent.firstActor,
    secondActor: apiEvent.secondActor,
    timestamp: apiEvent.timestamp,
  };
}

// Helper to create initial SerializedGameData for a new game
const createInitialGameData = (
  league: League,
  week: number,
  homeTeam: Team,
  awayTeam: Team
): SerializedGameData => {
  return {
    league_id: league.id,
    week: week,
    homeTeamName: homeTeam.name,
    awayTeamName: awayTeam.name,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    game: { points: [] },
    bookkeeperState: {
      activePoint: null,
      firstActor: null,
      homePossession: true,
      pointsAtHalf: 0,
      homePlayers: null,
      awayPlayers: null,
      homeScore: 0,
      awayScore: 0,
      homeParticipants: [],
      awayParticipants: [],
    },
    mementos: [],
  };
};

describe('Bookkeeper', () => {
  let bookkeeper: Bookkeeper;

  beforeEach(async () => {
    await db.games.clear();
    const initialGameData = createInitialGameData(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );
    bookkeeper = new Bookkeeper(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam, initialGameData);
    bookkeeper.recordActivePlayers(homeLine, awayLine);
  });

  afterAll(async () => {
    await db.games.clear();
    db.close();
  });

  function verifyEventCount(expected: number) {
    expect(bookkeeper.activePoint).not.toBeNull();
    expect(bookkeeper.activePoint!.getEventCount()).toBe(expected);
  }

  function verifyEvent(
    event: Event,
    type: EventType,
    firstActor: string,
    secondActor?: string | null
  ) {
    expect(event.type).toBe(type);
    expect(event.firstActor).toBe(firstActor);
    if (secondActor === undefined) {
      expect(event.secondActor === null || event.secondActor === undefined).toBe(true);
    } else {
      expect(event.secondActor).toBe(secondActor);
    }
    expect(event.timestamp).toBeDefined();
    expect(typeof event.timestamp).toBe('string');
  }

  test('testUndoRecordFirstActor', () => {
    bookkeeper.recordFirstActor(PLAYER1, true); // Home player starts with disc
    bookkeeper.undo();
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint).toBeNull();
  });

  test('testUndoPull', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordPull();
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoPass', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordPass(PLAYER3);
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
  });

  test('testUndoPoint', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordPass(PLAYER3);
    bookkeeper.recordPoint();
    expect(bookkeeper.homeScore).toBe(1);
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1);
    expect(bookkeeper.firstActor).toBe(PLAYER3);
    expect(bookkeeper.homeScore).toBe(0);
  });

  test('testUndoThrowAway', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoThrowAwayAfterPass', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordPass(PLAYER3);
    bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1);
    expect(bookkeeper.firstActor).toBe(PLAYER3);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoD', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordThrowAway();
    bookkeeper.recordFirstActor(PLAYER2, false);
    bookkeeper.recordD();
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1); // The THROW AWAY event
    expect(bookkeeper.firstActor).toBe(PLAYER2); // D undos to player having disc before D
  });

  test('testUndoCatchD', () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordThrowAway();
    bookkeeper.recordFirstActor(PLAYER2, false);
    bookkeeper.recordCatchD();
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1); // The THROW AWAY event
    expect(bookkeeper.firstActor).toBe(PLAYER2); // CatchD undos to player having disc before CatchD
  });

  test('testComplexScenario', () => {
    const initialGameData = createInitialGameData(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );
    bookkeeper = new Bookkeeper(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam, initialGameData);
    bookkeeper.recordActivePlayers(homeLine, awayLine);

    //1. P2 (Away) has disc, to pull. Point starts. Away possession.
    bookkeeper.recordFirstActor(PLAYER2, false); // isHomeTeamStartingWithDisc = false
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //2. P2 (Away) pulls. Home possession. firstActor is null.
    bookkeeper.recordPull();
    expect(bookkeeper.homePossession).toBe(true)
    expect(bookkeeper.firstActor).toBe(null);

    //3. P1 (Home) picks up. firstActor is P1
    bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.firstActor).toBe(PLAYER1);

    //4. Undo P1 picks up. firstActor is null.
    bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(null);

    //5. P3 (Home) picks up instead. firstActor is P3.
    bookkeeper.recordFirstActor(PLAYER3, true);
    expect(bookkeeper.firstActor).toBe(PLAYER3);

    //6. P3 (Home) passes to P1. firstActor is P1
    bookkeeper.recordPass(PLAYER1);
    expect(bookkeeper.firstActor).toBe(PLAYER1);

    //7. P1 (Home) throws away. Away possession. firstActor is null.
    bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(null);

    //8. firstActor is P2 (Away).
    bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //9. P2 (Away) got a Catch D firstActor is P2.
    bookkeeper.recordCatchD();
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //10. Undo CatchD. Event removed. firstActor is P2.
    bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //11. Undo P2 picks up. firstActor is null. Disc is loose after throwaway.
    bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(null);

    //12. P4 (Away) gets a D on the loose disc.
    bookkeeper.recordFirstActor(PLAYER4, false); // P4 (Away) is about to act
    bookkeeper.recordD(); // P4 (Away) gets a D. firstActor becomes null.
    expect(bookkeeper.firstActor).toBe(null);

    //13. P2 (Away) picks up after P4's D. firstActor is P2. Away possession.
    bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //14. P2 (Away) passes to P4 (Away). firstActor is P4.
    bookkeeper.recordPass(PLAYER4);
    expect(bookkeeper.firstActor).toBe(PLAYER4);

    //15. P4 (Away) scores. Away score = 1.
    bookkeeper.recordPoint();
    expect(bookkeeper.awayScore).toBe(1);
    expect(bookkeeper.firstActor).toBe(null);

    //16. Undo point. P4 (Away) has disc. Away score = 0.
    bookkeeper.undo();
    expect(bookkeeper.awayScore).toBe(0);
    expect(bookkeeper.firstActor).toBe(PLAYER4);

    expect(bookkeeper.activePoint).not.toBeNull();
    const events = bookkeeper.activePoint!.events;
    expect(events.length).toBe(5); // Pull, Pass(H), ThrowAway(H), D(A), Pass(A)

    verifyEvent(events[0], EventType.PULL, PLAYER2, null);
    verifyEvent(events[1], EventType.PASS, PLAYER3, PLAYER1);
    verifyEvent(events[2], EventType.THROWAWAY, PLAYER1, null);
    verifyEvent(events[3], EventType.DEFENSE, PLAYER4, null);
    verifyEvent(events[4], EventType.PASS, PLAYER2, PLAYER4);
  });

  test('should save and load game state with mementos via Dexie', async () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    bookkeeper.recordPass(PLAYER3);
    bookkeeper.recordThrowAway();

    const mementosCountBeforeSave = bookkeeper.getMementosCount();
    const homeScoreBeforeSave = bookkeeper.homeScore;
    const awayScoreBeforeSave = bookkeeper.awayScore;
    const firstActorBeforeSave = bookkeeper.firstActor;

    const serializedDataFromBk = bookkeeper.serialize();

    // Transform points for storage (ModelEvent with enum -> ApiPointEvent with string)
    const pointsForStorage: ApiPoint[] = serializedDataFromBk.game.points.map(modelPoint => ({
      offensePlayers: [...modelPoint.offensePlayers],
      defensePlayers: [...modelPoint.defensePlayers],
      events: modelPoint.events.map(mapModelEventToApiPointEvent),
    }));

    // Transform activePoint for storage
    let activePointForStorage: ApiPoint | null = null;
    if (serializedDataFromBk.bookkeeperState.activePoint) {
      activePointForStorage = {
        offensePlayers: [...serializedDataFromBk.bookkeeperState.activePoint.offensePlayers],
        defensePlayers: [...serializedDataFromBk.bookkeeperState.activePoint.defensePlayers],
        events: serializedDataFromBk.bookkeeperState.activePoint.events.map(mapModelEventToApiPointEvent),
      };
    }

    const bookkeeperStateForStorage: BookkeeperVolatileState = {
        ...serializedDataFromBk.bookkeeperState,
        activePoint: activePointForStorage as any, // Cast because stored format differs slightly
    };


    const gameToStore: StoredGame = {
      league_id: serializedDataFromBk.league_id,
      week: serializedDataFromBk.week,
      homeTeam: serializedDataFromBk.homeTeamName,
      homeTeamId: mockHomeTeam.id, // Added
      awayTeamId: mockAwayTeam.id, // Added
      homeScore: serializedDataFromBk.bookkeeperState.homeScore,
      homeRoster: serializedDataFromBk.bookkeeperState.homeParticipants,
      awayTeam: serializedDataFromBk.awayTeamName,
      awayScore: serializedDataFromBk.bookkeeperState.awayScore,
      awayRoster: serializedDataFromBk.bookkeeperState.awayParticipants,
      points: pointsForStorage,
      status: 'in-progress',
      lastModified: new Date(),
      bookkeeperState: bookkeeperStateForStorage,
      mementos: serializedDataFromBk.mementos,
    };
    const storedId = await db.games.add(gameToStore);
    expect(storedId).toBeDefined();

    const retrievedGame = await db.games.get(storedId!);
    expect(retrievedGame).toBeDefined();
    expect(retrievedGame!.mementos).toBeDefined();
    expect(retrievedGame!.bookkeeperState).toBeDefined();

    // Transform points from storage for Bookkeeper hydration (ApiPointEvent string -> ModelEvent enum)
    const gamePointsForHydration = retrievedGame!.points.map(apiPoint => ({
        offensePlayers: [...apiPoint.offensePlayers],
        defensePlayers: [...apiPoint.defensePlayers],
        events: apiPoint.events.map(mapApiPointEventToModelEvent),
    }));

    let activePointForHydration: { offensePlayers: string[]; defensePlayers: string[]; events: Event[] } | null = null;
    if (retrievedGame!.bookkeeperState?.activePoint) {
        const storedActivePoint = retrievedGame!.bookkeeperState.activePoint as unknown as ApiPoint;
        activePointForHydration = {
            offensePlayers: [...storedActivePoint.offensePlayers],
            defensePlayers: [...storedActivePoint.defensePlayers],
            events: storedActivePoint.events.map(mapApiPointEventToModelEvent),
        };
    }

    const bookkeeperStateForHydration: BookkeeperVolatileState = {
        ...(retrievedGame!.bookkeeperState!),
        activePoint: activePointForHydration,
    };


    const hydratedSerializedData: SerializedGameData = {
      league_id: retrievedGame!.league_id,
      week: retrievedGame!.week,
      homeTeamName: retrievedGame!.homeTeam,
      awayTeamName: retrievedGame!.awayTeam,
      homeTeamId: retrievedGame!.homeTeamId || mockHomeTeam.id, // Handle optional from DB
      awayTeamId: retrievedGame!.awayTeamId || mockAwayTeam.id, // Handle optional from DB
      game: { points: gamePointsForHydration },
      bookkeeperState: bookkeeperStateForHydration,
      mementos: retrievedGame!.mementos as SerializedMemento[],
    };

    const newBookkeeper = new Bookkeeper(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam,
      hydratedSerializedData
    );

    expect(newBookkeeper.homeScore).toBe(homeScoreBeforeSave);
    expect(newBookkeeper.awayScore).toBe(awayScoreBeforeSave);
    expect(newBookkeeper.firstActor).toBe(firstActorBeforeSave);
    expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave);
    expect(newBookkeeper.activePoint).not.toBeNull();

    const activePointEventsBeforeSave = serializedDataFromBk.bookkeeperState.activePoint?.events;
    const activePointEventsAfterLoad = newBookkeeper.serialize().bookkeeperState.activePoint?.events;
    expect(activePointEventsAfterLoad?.length).toBe(activePointEventsBeforeSave?.length);

    newBookkeeper.undo();
    expect(newBookkeeper.firstActor).toBe(PLAYER3);
    expect(newBookkeeper.homePossession).toBe(true);
    expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave - 1);

    const currentPointEvents = newBookkeeper.serialize().bookkeeperState.activePoint?.events;
    expect(currentPointEvents?.length).toBe(1); // PASS event remains
    expect(currentPointEvents?.[0].type).toBe(EventType.PASS);
  });
});
