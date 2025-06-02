import { Bookkeeper } from './Bookkeeper';
import { db } from './db'; // We'll mock this or use an in-memory version
import { StoredGame } from './db';
import { EventModel, EventType } from './models/EventModel';
import { PointModel } from './models/PointModel';
import Dexie from 'dexie';
import 'fake-indexeddb/auto'; // Polyfills IndexedDB in Node.js environment for testing

// Define a type for our test database
interface TestDB extends Dexie {
  games: Dexie.Table<StoredGame, number>;
}

const PLAYER1 = "Kevin Hughes";
const PLAYER2 = "Allan Godding";
const PLAYER3 = "Patrick Kenzie";

describe('Bookkeeper', () => {
  let bookkeeper: Bookkeeper;
  let testDb: TestDB;
  let gameId: number;

  const initialHomeRoster = [PLAYER1, PLAYER2, "HomePlayer3"];
  const initialAwayRoster = [PLAYER3, "AwayPlayer2", "AwayPlayer3"];

  beforeEach(async () => {
    // Create a new in-memory database for each test
    testDb = new Dexie('TestStatKeeperDB') as TestDB;
    testDb.version(1).stores({
      games: '++localId, serverId, league_id, week, status, lastModified',
    });
    await testDb.open();

    const newGame: Omit<StoredGame, 'localId'> = {
      league_id: 'test-league',
      week: 1,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      homeRoster: [...initialHomeRoster],
      awayRoster: [...initialAwayRoster],
      homeScore: 0,
      awayScore: 0,
      points: [],
      status: 'new',
      lastModified: new Date(),
    };
    gameId = await testDb.games.add(newGame as StoredGame);

    bookkeeper = new Bookkeeper(gameId, testDb as any); // Cast 'any' for simplicity if db types don't perfectly align for test
    await bookkeeper.loadGame();
    
    // Set initial lines for points, similar to recordActivePlayers
    // Tests can override this by calling setCurrentLine again if needed.
    bookkeeper.setCurrentLine([...initialHomeRoster], [...initialAwayRoster]);
  });

  afterEach(async () => {
    // Clean up the database after each test
    await testDb.delete();
    testDb.close();
  });

  const recordPass = async () => {
    // Assuming PLAYER1 is on the home team and home team has possession initially for this helper
    bookkeeper.recordFirstActor(PLAYER1, true); // Player1 from home team has disc
    await bookkeeper.recordPass(PLAYER2);
  };

  const verifyEventCount = (expected: number) => {
    expect(bookkeeper.activePoint?.getEventCount() ?? 0).toBe(expected);
  };

  const verifyEvent = (event: EventModel | undefined, type: EventType, firstActor: string, secondActor: string | null = null) => {
    expect(event).toBeDefined();
    if (event) {
      expect(event.type).toBe(type);
      expect(event.firstActor).toBe(firstActor);
      expect(event.secondActor).toBe(secondActor);
    }
  };

  it('testUndoRecordFirstActor', async () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint).toBeNull(); // Undoing first actor of a new point should remove the point
  });

  it('testUndoPull', async () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPull();
    await bookkeeper.undo();

    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true); // Possession should revert
  });

  it('testUndoPass', async () => {
    await recordPass(); // Records PLAYER1 pass to PLAYER2
    await bookkeeper.undo();

    verifyEventCount(0); // Pass undone, activePoint should have 0 events
    expect(bookkeeper.firstActor).toBe(PLAYER1); // PLAYER1 should be firstActor again
  });

  it('testUndoPoint', async () => {
    await recordPass(); // PLAYER1 passes to PLAYER2
    bookkeeper.firstActor = PLAYER2; // Ensure PLAYER2 is scorer
    await bookkeeper.recordPoint();
    
    expect(bookkeeper.gameData.homeScore).toBe(1);
    await bookkeeper.undo();

    verifyEventCount(1); // Point event removed, pass event remains
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.PASS);
    expect(bookkeeper.firstActor).toBe(PLAYER2); // PLAYER2 was the actor before scoring
    expect(bookkeeper.gameData.homeScore).toBe(0);
  });

  it('testUndoThrowAway', async () => {
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway();
    await bookkeeper.undo();

    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true); // Possession should revert
  });

  it('testUndoThrowAwayAfterPass', async () => {
    await recordPass(); // PLAYER1 passes to PLAYER2, PLAYER2 is firstActor
    await bookkeeper.recordThrowAway(); // PLAYER2 throws away
    await bookkeeper.undo();

    verifyEventCount(1); // Throwaway undone, pass event remains
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.PASS);
    expect(bookkeeper.firstActor).toBe(PLAYER2); // PLAYER2 should be firstActor again
    expect(bookkeeper.homePossession).toBe(true); // Possession should revert
  });

  it('testUndoD', async () => {
    // Home (PLAYER1) has disc
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway(); // Turnover, Away possession
    
    // Away (PLAYER2) picks up
    bookkeeper.recordFirstActor(PLAYER2, false); 
    expect(bookkeeper.homePossession).toBe(false); // Away has disc

    // PLAYER2 (Away) throws, PLAYER3 (Home) gets D
    bookkeeper.firstActor = PLAYER3; // Assume PLAYER3 (Home) is selected for D
    await bookkeeper.recordD(); // D by PLAYER3, Home possession
    expect(bookkeeper.homePossession).toBe(true);

    await bookkeeper.undo(); // Undo D

    verifyEventCount(1); // D undone, Throwaway event remains
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.THROWAWAY);
    expect(bookkeeper.firstActor).toBe(PLAYER3); // Player who was selected for D
    expect(bookkeeper.homePossession).toBe(false); // Possession reverts to Away team (PLAYER2 had it)
  });

  it('testUndoCatchD', async () => {
    // Home (PLAYER1) has disc
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway(); // Turnover, Away possession
    
    // Away (PLAYER2) picks up
    bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.homePossession).toBe(false);

    // PLAYER3 (Home) gets Catch D
    bookkeeper.firstActor = PLAYER3; // Assume PLAYER3 (Home) is selected for Catch D
    await bookkeeper.recordCatchD(); // Catch D by PLAYER3, Home possession
    expect(bookkeeper.homePossession).toBe(true);
    expect(bookkeeper.firstActor).toBe(PLAYER3); // PLAYER3 still first actor

    await bookkeeper.undo(); // Undo Catch D

    verifyEventCount(1); // Catch D undone, Throwaway event remains
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.THROWAWAY);
    expect(bookkeeper.firstActor).toBe(PLAYER3); // Player who was selected for D
    expect(bookkeeper.homePossession).toBe(false); // Possession reverts to Away team
  });

  const verifyComplexScenarioEvents = () => {
    verifyEventCount(5);
    const events = bookkeeper.activePoint?.getEvents() ?? [];

    verifyEvent(events[0], EventType.PULL, PLAYER2, null);
    verifyEvent(events[1], EventType.PASS, PLAYER3, PLAYER2);
    verifyEvent(events[2], EventType.THROWAWAY, PLAYER2, null);
    verifyEvent(events[3], EventType.DEFENSE, PLAYER1, null);
    verifyEvent(events[4], EventType.PASS, PLAYER2, PLAYER3);
  };

  it('testComplexScenario', async () => {
    // Initial setup: Away team (PLAYER2) to pull
    bookkeeper.setCurrentLine(initialHomeRoster, initialAwayRoster); // Ensure lines are set
    bookkeeper.recordFirstActor(PLAYER2, false); // PLAYER2 from Away team selected
    await bookkeeper.recordPull(); // PLAYER2 pulls, Home team receives

    // Home team (PLAYER1) picks up
    bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.undo(); // Undo PLAYER1 selected -> firstActor is null, activePoint has 1 event (PULL)
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint?.getEventCount()).toBe(1);


    // Home team (PLAYER3) picks up instead
    bookkeeper.recordFirstActor(PLAYER3, true); // PLAYER3 has disc
    await bookkeeper.recordPass(PLAYER2); // PLAYER3 passes to PLAYER2 (both Home), PLAYER2 has disc
    await bookkeeper.recordThrowAway(); // PLAYER2 (Home) throws away, Away team possession

    // Away team (PLAYER2) picks up
    bookkeeper.recordFirstActor(PLAYER2, false); // PLAYER2 (Away) has disc
    
    // Simulating the Java test's sequence for CatchD and subsequent undos
    // After PLAYER2 (Away) is firstActor (from pickup):
    // bookkeeper.firstActor = PLAYER2; bookkeeper.homePossession = false;
    await bookkeeper.recordCatchD(); // P2 (Away) gets D. homePossession becomes true. firstActor is P2.
    
    await bookkeeper.undo();   //undo CatchD. firstActor=P2(A), homePossession=false. activePoint has TA.
    expect(bookkeeper.firstActor).toBe(PLAYER2);
    expect(bookkeeper.homePossession).toBe(false); // Possession back to Away
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.THROWAWAY);


    await bookkeeper.undo();   //undo recordFirstActor(P2, false). firstActor=null, homePossession=false (still Away's possession after Home's TA).
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.homePossession).toBe(false); 
    expect(bookkeeper.activePoint?.getLastEvent()?.type).toBe(EventType.THROWAWAY);


    // Home team (PLAYER1) gets a D (disc was loose or thrown by Away)
    bookkeeper.recordFirstActor(PLAYER1, true); // PLAYER1 (Home) selected for the D. homePossession becomes true.
    await bookkeeper.recordD(); // PLAYER1 (Home) gets D. firstActor is null. homePossession is true.
    
    // Away team (PLAYER2) picks up
    bookkeeper.recordFirstActor(PLAYER2, false); // PLAYER2 (Away) picks up. homePossession = false.
    
    await bookkeeper.recordPass(PLAYER3); // PLAYER2 (Away) passes to PLAYER3 (Away). firstActor = P3 (Away).
    await bookkeeper.recordPoint(); // PLAYER3 (Away) scores. AwayScore = 1.
    
    await bookkeeper.undo(); // Undo point. firstActor = P3 (Away). AwayScore = 0. activePoint has D and Pass.

    verifyComplexScenarioEvents(); 
  });
});
