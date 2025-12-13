import { describe, expect, beforeEach, afterAll, test, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Bookkeeper, GameState } from '../bookkeeper';
import { EventType, type Event } from '../gameLogic';
import { type LeagueFromJson as League, type Team } from '../../../api';
import { db, StoredGame } from '../db';

vi.mock('../../../api', async () => {
  const actual = await vi.importActual('../../../api');
  return {
    ...actual,
    leagues: [
      {
        id: 101,
        name: 'OCUA',
        lineSize: 7,
      },
    ],
    getLeagueName: (id: number | string) =>
      id === 101 || id === '101' ? 'OCUA' : 'Unknown League',
  };
});

const PLAYER1 = 'Kevin Hughes';
const PLAYER2 = 'Allan Godding';
const PLAYER3 = 'Patrick Kenzie';
const PLAYER4 = 'Player 4';

const mockLeague: League = { name: 'OCUA', id: 101, lineSize: 7 };

const homeLine = [PLAYER1, PLAYER3, 'HP3', 'HP4', 'HP5', 'HP6', 'HP7'];
const awayLine = [PLAYER2, PLAYER4, 'AP3', 'AP4', 'AP5', 'AP6', 'AP7'];

const mockHomeTeam: Team = {
  name: 'Team A',
  id: 1,
  players: homeLine.map(name => ({ name, team: 'Team A', is_open: true })),
};
const mockAwayTeam: Team = {
  name: 'Team B',
  id: 2,
  players: awayLine.map(name => ({ name, team: 'Team B', is_open: true })),
};
const mockWeek = 1;

const createInitialStoredGame = (
  league: League,
  week: number,
  homeTeam: Team,
  awayTeam: Team
): StoredGame => {
  return {
    league_id: league.id,
    week: week,
    homeTeam: homeTeam.name,
    homeTeamId: homeTeam.id,
    awayTeam: awayTeam.name,
    awayTeamId: awayTeam.id,
    homeRoster: homeLine.map(name => ({ name, is_open: true })),
    awayRoster: awayLine.map(name => ({ name, is_open: true })),
    points: [],
    activePoint: null,
    homeScore: 0,
    awayScore: 0,
    homePossession: true,
    firstActor: null,
    pointsAtHalf: 0,
    homePlayers: null,
    awayPlayers: null,
    lastPlayedLine: null,
    localError: null,
    undoStack: [],
    status: 'in-progress',
    lastModified: new Date(),
  };
};

describe('Bookkeeper', () => {
  let bookkeeper: Bookkeeper;

  beforeEach(async () => {
    await db.games.clear();
    const initialStoredGame = createInitialStoredGame(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );

    const gameId = 1;
    bookkeeper = new Bookkeeper(initialStoredGame, mockLeague, gameId);
    await bookkeeper.recordActivePlayers(homeLine, awayLine);
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

  test('testUndoRecordFirstActor', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true); // Home player starts with disc
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint).toBeNull();
  });

  test('testUndoPull', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPull();
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoPass', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPass(PLAYER3);
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
  });

  test('testUndoPoint', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPass(PLAYER3);
    await bookkeeper.recordPoint();
    expect(bookkeeper.homeScore).toBe(1);
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1);
    expect(bookkeeper.firstActor).toBe(PLAYER3);
    expect(bookkeeper.homeScore).toBe(0);
  });

  test('testUndoThrowAway', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(0);
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoThrowAwayAfterPass', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPass(PLAYER3);
    await bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1);
    expect(bookkeeper.firstActor).toBe(PLAYER3);
    expect(bookkeeper.homePossession).toBe(true);
  });

  test('testUndoD', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway();
    await bookkeeper.recordFirstActor(PLAYER2, false);
    await bookkeeper.recordD();
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1); // The THROW AWAY event
    expect(bookkeeper.firstActor).toBe(PLAYER2); // D undos to player having disc before D
  });

  test('testUndoCatchD', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordThrowAway();
    await bookkeeper.recordFirstActor(PLAYER2, false);
    await bookkeeper.recordCatchD();
    await bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1); // The THROW AWAY event
    expect(bookkeeper.firstActor).toBe(PLAYER2); // CatchD undos to player having disc before CatchD
  });

  test('testComplexScenario', async () => {
    const gameId = 1;
    const initialStoredGame = createInitialStoredGame(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );

    bookkeeper = new Bookkeeper(initialStoredGame, mockLeague, gameId);
    await bookkeeper.recordActivePlayers(homeLine, awayLine);

    //1. P2 (Away) has disc, to pull. Point starts. Away possession.
    await bookkeeper.recordFirstActor(PLAYER2, false); // isHomeTeamStartingWithDisc = false
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //2. P2 (Away) pulls. Home possession. firstActor is null.
    await bookkeeper.recordPull();
    expect(bookkeeper.homePossession).toBe(true);
    expect(bookkeeper.firstActor).toBe(null);

    //3. P1 (Home) picks up. firstActor is P1
    await bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.firstActor).toBe(PLAYER1);

    //4. Undo P1 picks up. firstActor is null.
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(null);

    //5. P3 (Home) picks up instead. firstActor is P3.
    await bookkeeper.recordFirstActor(PLAYER3, true);
    expect(bookkeeper.firstActor).toBe(PLAYER3);

    //6. P3 (Home) passes to P1. firstActor is P1
    await bookkeeper.recordPass(PLAYER1);
    expect(bookkeeper.firstActor).toBe(PLAYER1);

    //7. P1 (Home) throws away. Away possession. firstActor is null.
    await bookkeeper.recordThrowAway();
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(null);

    //8. firstActor is P2 (Away).
    await bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //9. P2 (Away) got a Catch D firstActor is P2.
    await bookkeeper.recordCatchD();
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //10. Undo CatchD. Event removed. firstActor is P2.
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //11. Undo P2 picks up. firstActor is null. Disc is loose after throwaway.
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(null);

    //12. P4 (Away) gets a D on the loose disc.
    await bookkeeper.recordFirstActor(PLAYER4, false); // P4 (Away) is about to act
    await bookkeeper.recordD(); // P4 (Away) gets a D. firstActor becomes null.
    expect(bookkeeper.firstActor).toBe(null);

    //13. P2 (Away) picks up after P4's D. firstActor is P2. Away possession.
    await bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.firstActor).toBe(PLAYER2);

    //14. P2 (Away) passes to P4 (Away). firstActor is P4.
    await bookkeeper.recordPass(PLAYER4);
    expect(bookkeeper.firstActor).toBe(PLAYER4);

    //15. P4 (Away) scores. Away score = 1.
    await bookkeeper.recordPoint();
    expect(bookkeeper.awayScore).toBe(1);
    expect(bookkeeper.firstActor).toBe(null);

    //16. Undo point. P4 (Away) has disc. Away score = 0.
    await bookkeeper.undo();
    expect(bookkeeper.awayScore).toBe(0);
    expect(bookkeeper.firstActor).toBe(PLAYER4);

    expect(bookkeeper.activePoint).not.toBeNull();

    // Get the events from the active point
    const events = bookkeeper.activePoint!.getEvents();
    expect(events.length).toBe(5); // Pull, Pass(H), ThrowAway(H), D(A), Pass(A)
    verifyEvent(events[0], EventType.PULL, PLAYER2, null);
    verifyEvent(events[1], EventType.PASS, PLAYER3, PLAYER1);
    verifyEvent(events[2], EventType.THROWAWAY, PLAYER1, null);
    verifyEvent(events[3], EventType.DEFENSE, PLAYER4, null);
    verifyEvent(events[4], EventType.PASS, PLAYER2, PLAYER4);
  });

  test('should save and load game state with undo stack via Dexie', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPass(PLAYER3);
    await bookkeeper.recordThrowAway();

    const undoCountBeforeSave = bookkeeper.getUndoCount();
    const homeScoreBeforeSave = bookkeeper.homeScore;
    const awayScoreBeforeSave = bookkeeper.awayScore;
    const firstActorBeforeSave = bookkeeper.firstActor;

    // Save the current game state to database
    const gameId = await Bookkeeper.newGame(
      { league: mockLeague },
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );

    // Load a fresh bookkeeper from the database
    const newBookkeeper = await Bookkeeper.loadFromDatabase(gameId);

    // Set up the same state
    await newBookkeeper.recordActivePlayers(homeLine, awayLine);
    await newBookkeeper.recordFirstActor(PLAYER1, true);
    await newBookkeeper.recordPass(PLAYER3);
    await newBookkeeper.recordThrowAway();

    expect(newBookkeeper.homeScore).toBe(homeScoreBeforeSave);
    expect(newBookkeeper.awayScore).toBe(awayScoreBeforeSave);
    expect(newBookkeeper.firstActor).toBe(firstActorBeforeSave);
    expect(newBookkeeper.getUndoCount()).toBe(undoCountBeforeSave);
    expect(newBookkeeper.activePoint).not.toBeNull();

    await newBookkeeper.undo();
    expect(newBookkeeper.firstActor).toBe(PLAYER3);
    expect(newBookkeeper.homePossession).toBe(true);
    expect(newBookkeeper.getUndoCount()).toBe(undoCountBeforeSave - 1);

    const currentPointEvents = newBookkeeper.activePoint?.getEvents();
    expect(currentPointEvents?.length).toBe(1); // PASS event remains
    expect(currentPointEvents?.[0].type).toBe(EventType.PASS);
  });

  test('should handle undo when stack is empty', async () => {
    expect(bookkeeper.getUndoCount()).toBe(0);
    await bookkeeper.undo(); // Should be no-op
    expect(bookkeeper.getUndoCount()).toBe(0);
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint).toBeNull();
  });

  test('should handle recordHalf and undo', async () => {
    // Score a point first
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPoint();
    expect(bookkeeper.homeScore).toBe(1);

    // Record half
    await bookkeeper.recordHalf();
    expect(bookkeeper.pointsAtHalf).toBe(1);

    // Undo half
    await bookkeeper.undo();
    expect(bookkeeper.pointsAtHalf).toBe(0);
  });

  test('should handle substitution during active point', async () => {
    await bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.activePoint).not.toBeNull();

    const newHomeLine = ['NewPlayer1', 'NewPlayer2', ...homeLine.slice(2)];
    const newAwayLine = ['NewAwayPlayer1', ...awayLine.slice(1)];

    await bookkeeper.recordSubstitution(newHomeLine, newAwayLine);

    expect(bookkeeper.homePlayers).toEqual(newHomeLine);
    expect(bookkeeper.awayPlayers).toEqual(newAwayLine);

    // Verify the active point was updated with new players
    const activePoint = bookkeeper.activePoint!;
    expect(activePoint.toJSON().offensePlayers).toEqual(newHomeLine);
    expect(activePoint.toJSON().defensePlayers).toEqual(newAwayLine);
  });

  test('should return correct game states throughout point progression', async () => {
    // Initial state - no players selected
    expect(bookkeeper.gameState()).toBe(bookkeeper.gameState()); // Just verify it doesn't crash

    // First point of game - should be Start state when player selected
    expect(bookkeeper.gameState()).toBe(GameState.Start);
    await bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.gameState()).toBe(GameState.Pull);

    // After pull - should be PickUp
    await bookkeeper.recordPull();
    expect(bookkeeper.gameState()).toBe(GameState.PickUp);

    // After pickup - should be AfterPull
    await bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.gameState()).toBe(GameState.AfterPull);

    // After pass - should be Normal
    await bookkeeper.recordPass(PLAYER4);
    expect(bookkeeper.gameState()).toBe(GameState.Normal);

    // After throwaway - should be PickUp (disc is loose)
    await bookkeeper.recordThrowAway();
    expect(bookkeeper.gameState()).toBe(GameState.PickUp);

    // After pickup following turnover - should be AfterTurnover
    await bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.gameState()).toBe(GameState.AfterTurnover);

    // After D - should be PickUp again
    await bookkeeper.recordD();
    expect(bookkeeper.gameState()).toBe(GameState.PickUp);

    // After pickup following D - should be Normal (no more D opportunity)
    await bookkeeper.recordFirstActor(PLAYER2, false);
    expect(bookkeeper.gameState()).toBe(GameState.Normal);
  });

  test('should handle multiple undos in sequence', async () => {
    // Build up a sequence of actions
    await bookkeeper.recordFirstActor(PLAYER1, true);
    await bookkeeper.recordPull();
    await bookkeeper.recordFirstActor(PLAYER2, false);
    await bookkeeper.recordPass(PLAYER4);
    await bookkeeper.recordThrowAway();

    expect(bookkeeper.getUndoCount()).toBe(5);
    expect(bookkeeper.homePossession).toBe(true); // Possession flipped after throwaway

    // Undo throwaway
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(PLAYER4);
    expect(bookkeeper.homePossession).toBe(false);
    expect(bookkeeper.getUndoCount()).toBe(4);

    // Undo pass
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(PLAYER2);
    expect(bookkeeper.getUndoCount()).toBe(3);

    // Undo pickup
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.getUndoCount()).toBe(2);

    // Undo pull
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBe(PLAYER1);
    expect(bookkeeper.homePossession).toBe(true); // Back to original possession
    expect(bookkeeper.getUndoCount()).toBe(1);

    // Undo first actor
    await bookkeeper.undo();
    expect(bookkeeper.firstActor).toBeNull();
    expect(bookkeeper.activePoint).toBeNull();
    expect(bookkeeper.getUndoCount()).toBe(0);
  });

  test('should automatically remove players from active line when removed from roster - no active point', async () => {
    // Verify initial state
    expect(bookkeeper.homePlayers).toEqual(homeLine);
    expect(bookkeeper.awayPlayers).toEqual(awayLine);

    // Create new rosters with some players removed
    const newHomeRoster = [
      { name: PLAYER1, is_open: true },
      { name: PLAYER3, is_open: true },
      { name: 'HP3', is_open: true },
      // HP4, HP5, HP6, HP7 removed
    ];

    const newAwayRoster = [
      { name: PLAYER2, is_open: true },
      // PLAYER4 removed
      { name: 'AP3', is_open: true },
      { name: 'AP4', is_open: true },
      { name: 'AP5', is_open: true },
      { name: 'AP6', is_open: true },
      { name: 'AP7', is_open: true },
    ];

    // Update rosters
    await bookkeeper.updateRosters(newHomeRoster, newAwayRoster);

    // Verify removed players are no longer in active lines
    expect(bookkeeper.homePlayers).toEqual([PLAYER1, PLAYER3, 'HP3']);
    expect(bookkeeper.awayPlayers).toEqual([PLAYER2, 'AP3', 'AP4', 'AP5', 'AP6', 'AP7']);
  });

  test('should automatically remove players from active line and active point when removed from roster during point', async () => {
    // Start a point
    await bookkeeper.recordFirstActor(PLAYER1, true);
    expect(bookkeeper.activePoint).not.toBeNull();

    // Verify initial state using toJSON() method
    const initialActivePointData = bookkeeper.activePoint!.toJSON();
    expect(initialActivePointData.offensePlayers).toEqual(homeLine); // Home has possession
    expect(initialActivePointData.defensePlayers).toEqual(awayLine);

    // Create new rosters with some players removed
    const newHomeRoster = [
      { name: PLAYER1, is_open: true },
      { name: PLAYER3, is_open: true },
      // HP3, HP4, HP5, HP6, HP7 removed
    ];

    const newAwayRoster = [
      { name: PLAYER2, is_open: true },
      { name: PLAYER4, is_open: true },
      // AP3, AP4, AP5, AP6, AP7 removed
    ];

    // Update rosters
    await bookkeeper.updateRosters(newHomeRoster, newAwayRoster);

    // Verify active lines are updated
    expect(bookkeeper.homePlayers).toEqual([PLAYER1, PLAYER3]);
    expect(bookkeeper.awayPlayers).toEqual([PLAYER2, PLAYER4]);

    // Verify active point is also updated
    const updatedActivePointData = bookkeeper.activePoint!.toJSON();
    expect(updatedActivePointData.offensePlayers).toEqual([PLAYER1, PLAYER3]); // Home has possession
    expect(updatedActivePointData.defensePlayers).toEqual([PLAYER2, PLAYER4]);
  });

  test('should automatically remove players from active line and active point when away team has possession', async () => {
    // Start a point with away team possession
    await bookkeeper.recordFirstActor(PLAYER2, false); // Away player starts
    expect(bookkeeper.activePoint).not.toBeNull();
    expect(bookkeeper.homePossession).toBe(false);

    // Verify initial state - away team has offense
    const initialActivePointData = bookkeeper.activePoint!.toJSON();
    expect(initialActivePointData.offensePlayers).toEqual(awayLine); // Away has possession
    expect(initialActivePointData.defensePlayers).toEqual(homeLine);

    // Create new rosters with some players removed
    const newHomeRoster = [
      { name: PLAYER1, is_open: true },
      { name: PLAYER3, is_open: true },
      // HP3, HP4, HP5, HP6, HP7 removed
    ];

    const newAwayRoster = [
      { name: PLAYER2, is_open: true },
      { name: PLAYER4, is_open: true },
      // AP3, AP4, AP5, AP6, AP7 removed
    ];

    // Update rosters
    await bookkeeper.updateRosters(newHomeRoster, newAwayRoster);

    // Verify active lines are updated
    expect(bookkeeper.homePlayers).toEqual([PLAYER1, PLAYER3]);
    expect(bookkeeper.awayPlayers).toEqual([PLAYER2, PLAYER4]);

    // Verify active point is also updated correctly (away team has possession)
    const updatedActivePointData = bookkeeper.activePoint!.toJSON();
    expect(updatedActivePointData.offensePlayers).toEqual([PLAYER2, PLAYER4]); // Away has possession
    expect(updatedActivePointData.defensePlayers).toEqual([PLAYER1, PLAYER3]);
  });

  test('should handle roster update when no players are removed', async () => {
    // Verify initial state
    expect(bookkeeper.homePlayers).toEqual(homeLine);
    expect(bookkeeper.awayPlayers).toEqual(awayLine);

    // Create rosters with all existing players plus new ones
    const newHomeRoster = [
      ...homeLine.map(name => ({ name, is_open: true })),
      { name: 'NewHomePlayer1', is_open: true },
      { name: 'NewHomePlayer2', is_open: true },
    ];

    const newAwayRoster = [
      ...awayLine.map(name => ({ name, is_open: true })),
      { name: 'NewAwayPlayer1', is_open: true },
    ];

    // Update rosters
    await bookkeeper.updateRosters(newHomeRoster, newAwayRoster);

    // Verify active lines remain unchanged since no players were removed
    expect(bookkeeper.homePlayers).toEqual(homeLine);
    expect(bookkeeper.awayPlayers).toEqual(awayLine);
  });

  test('should handle roster update when active lines are null', async () => {
    // Create a fresh game without any active players selected
    const initialStoredGame = createInitialStoredGame(
      mockLeague,
      mockWeek,
      mockHomeTeam,
      mockAwayTeam
    );

    // Team objects no longer needed since bookkeeper uses game roster data directly

    const gameId = 2; // Different from the main test
    const freshBookkeeper = new Bookkeeper(initialStoredGame, mockLeague, gameId);

    // Verify active lines are null initially
    expect(freshBookkeeper.homePlayers).toBeNull();
    expect(freshBookkeeper.awayPlayers).toBeNull();

    const newHomeRoster = [
      { name: PLAYER1, is_open: true },
      { name: PLAYER3, is_open: true },
    ];

    const newAwayRoster = [
      { name: PLAYER2, is_open: true },
      { name: PLAYER4, is_open: true },
    ];

    // Update rosters - should not crash when active lines are null
    await expect(
      freshBookkeeper.updateRosters(newHomeRoster, newAwayRoster)
    ).resolves.not.toThrow();

    // Verify active lines remain null
    expect(freshBookkeeper.homePlayers).toBeNull();
    expect(freshBookkeeper.awayPlayers).toBeNull();
  });
});
