import { describe, expect, beforeEach, afterAll, test, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Bookkeeper } from '../bookkeeper';
import {
  EventType,
  mapEventToApiEvent,
} from '../models';
import { Point as ApiPoint, type LeagueFromJson as League, type Team } from '../../../api';
import { db, StoredGame } from '../db';

// Mock the API leagues
vi.mock('../../../api', async () => {
  const actual = await vi.importActual('../../../api');
  return {
    ...actual,
    leagues: [
      {
        id: '101',
        name: 'OCUA',
        lineSize: 7,
      },
    ],
    getLeagueName: (id: string) => (id === '101' ? 'OCUA' : 'Unknown League'),
  };
});

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

// Helper to create initial StoredGame for a new game
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
    homeRoster: [],
    awayRoster: [],
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
    currentView: 'selectLines',
    localError: null,
    undoStack: [],
    status: 'new',
    lastModified: new Date(),
  };
};

describe('Bookkeeper', () => {
  let bookkeeper: Bookkeeper;

  beforeEach(async () => {
    await db.games.clear();
    const initialStoredGame = createInitialStoredGame(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam);
    
    // Create team objects with rosters
    const homeTeamWithRoster: Team = {
      ...mockHomeTeam,
      players: homeLine.map(name => ({
        name,
        team: mockHomeTeam.name,
        is_male: true
      }))
    };

    const awayTeamWithRoster: Team = {
      ...mockAwayTeam,
      players: awayLine.map(name => ({
        name,
        team: mockAwayTeam.name,
        is_male: true
      }))
    };

    bookkeeper = new Bookkeeper(initialStoredGame, mockLeague, homeTeamWithRoster, awayTeamWithRoster);
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
    const initialStoredGame = createInitialStoredGame(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam);
    
    // Create team objects with rosters
    const homeTeamWithRoster: Team = {
      ...mockHomeTeam,
      players: homeLine.map(name => ({
        name,
        team: mockHomeTeam.name,
        is_male: true
      }))
    };

    const awayTeamWithRoster: Team = {
      ...mockAwayTeam,
      players: awayLine.map(name => ({
        name,
        team: mockAwayTeam.name,
        is_male: true
      }))
    };

    bookkeeper = new Bookkeeper(initialStoredGame, mockLeague, homeTeamWithRoster, awayTeamWithRoster);
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
    const events = bookkeeper.activePoint!.events;
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

    const mementosCountBeforeSave = bookkeeper.getMementosCount();
    const homeScoreBeforeSave = bookkeeper.homeScore;
    const awayScoreBeforeSave = bookkeeper.awayScore;
    const firstActorBeforeSave = bookkeeper.firstActor;

    // Save the current game state to database
    const gameId = await Bookkeeper.newGame(
      { league: mockLeague },
      mockWeek,
      mockHomeTeam,
      mockAwayTeam,
      homeLine,
      awayLine
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
    expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave);
    expect(newBookkeeper.activePoint).not.toBeNull();

    await newBookkeeper.undo();
    expect(newBookkeeper.firstActor).toBe(PLAYER3);
    expect(newBookkeeper.homePossession).toBe(true);
    expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave - 1);

    const currentPointEvents = newBookkeeper.activePoint?.events;
    expect(currentPointEvents?.length).toBe(1); // PASS event remains
    expect(currentPointEvents?.[0].type).toBe(EventType.PASS);
  });
});
