import { describe, expect, beforeEach, afterAll, test } from 'vitest';
import { Bookkeeper } from '../bookkeeper';
import {
  EventType,
  League,
  Team,
  Event,
  // GameModel, // No longer directly passed as GameModel
  PointModel,
  SerializedGameData,
} from '../models';
import 'fake-indexeddb/auto';
import { db, StoredGame } from '../db';

const PLAYER1 = 'Kevin Hughes';
const PLAYER2 = 'Allan Godding';
const PLAYER3 = 'Patrick Kenzie';
const PLAYER4 = 'Player 4';

const mockLeague: League = { name: 'OCUA', id: '101' };
const mockHomeTeam: Team = { name: 'Team A', id: 1 };
const mockAwayTeam: Team = { name: 'Team B', id: 2 };
const mockWeek = 1;

const homeLine = [PLAYER1, PLAYER3, 'HP3', 'HP4', 'HP5', 'HP6', 'HP7'];
const awayLine = [PLAYER2, PLAYER4, 'AP3', 'AP4', 'AP5', 'AP6', 'AP7'];

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
      homePossession: true, // Default for a new game, typically home starts on O or D decided by flip
      pointsAtHalf: 0,
      homePlayers: null, // Will be set by recordActivePlayers
      awayPlayers: null, // Will be set by recordActivePlayers
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
    verifyEventCount(1); 
    expect(bookkeeper.firstActor).toBe(PLAYER2);
  });

  test('testUndoCatchD', () => {
    bookkeeper.recordFirstActor(PLAYER1, true); 
    bookkeeper.recordThrowAway(); 
    bookkeeper.recordFirstActor(PLAYER2, false); 
    bookkeeper.recordCatchD(); 
    bookkeeper.undo();

    expect(bookkeeper.activePoint).not.toBeNull();
    verifyEventCount(1);
    expect(bookkeeper.firstActor).toBe(PLAYER2); // firstActor is not changed by CatchD, so it remains PLAYER2
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
    // For a D on a loose disc, the player making the D is recorded as firstActor.
    // The team that *would* have possessed the disc (Home, in this case, as Away threw it away)
    // is the context for `isHomeTeamPlayer`.
    // However, the current logic for recordD assumes firstActor is the one who *would have* picked up.
    // Let's follow the existing pattern: after a turnover, the new possessing team's player picks up.
    // If P4 (Away) gets a D, it implies they are now on offense.
    // So, P4 (Away) picks up, then gets a D. This seems like a CatchD scenario if P4 is Away.
    // If it's a D on a *pass* from Home, then Away player (P4) makes D, then Away player picks up.
    // The test implies P1 (Home) threw away. Disc is loose. P4 (Away) makes a play.
    // If P4 (Away) gets a D, it means they prevented completion.
    // Then someone from Away (e.g. P2) picks up.
    // The original test had: bookkeeper.recordFirstActor(PLAYER4, true); bookkeeper.recordD();
    // This implies PLAYER4 (Away) was recorded as firstActor, but with isHomeTeamPlayer=true, which is contradictory.
    // Let's assume P4 (Away) is making the D. So, after throwaway by Home, Away has possession.
    // P4 (Away) is selected as the player who will act (e.g. pick up).
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

    const serializedData = bookkeeper.serialize();

    const gameToStore: StoredGame = {
      league_id: serializedData.league_id,
      week: serializedData.week,
      homeTeam: serializedData.homeTeamName,
      homeScore: serializedData.bookkeeperState.homeScore,
      homeRoster: serializedData.bookkeeperState.homeParticipants, // Ensure these are correctly populated
      awayTeam: serializedData.awayTeamName,
      awayScore: serializedData.bookkeeperState.awayScore,
      awayRoster: serializedData.bookkeeperState.awayParticipants, // Ensure these are correctly populated
      points: serializedData.game.points.map(p => ({
        offensePlayers: p.offensePlayers,
        defensePlayers: p.defensePlayers,
        events: p.events.map(e => ({
          type: e.type.toString(),
          firstActor: e.firstActor,
          secondActor: e.secondActor || '', 
          timestamp: e.timestamp,
        })),
      })),
      status: 'in-progress',
      lastModified: new Date(),
      bookkeeperState: serializedData.bookkeeperState,
      mementos: serializedData.mementos,
    };
    const storedId = await db.games.add(gameToStore);
    expect(storedId).toBeDefined();

    const retrievedGame = await db.games.get(storedId!);
    expect(retrievedGame).toBeDefined();
    expect(retrievedGame!.mementos).toBeDefined();
    expect(retrievedGame!.bookkeeperState).toBeDefined();

    const hydratedSerializedData: SerializedGameData = {
      league_id: retrievedGame!.league_id,
      week: retrievedGame!.week,
      homeTeamName: retrievedGame!.homeTeam,
      awayTeamName: retrievedGame!.awayTeam,
      homeTeamId: mockHomeTeam.id, 
      awayTeamId: mockAwayTeam.id, 
      game: { points: retrievedGame!.points.map(p => PointModel.fromJSON(p as any)) }, 
      bookkeeperState: retrievedGame!.bookkeeperState!,
      mementos: retrievedGame!.mementos!,
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
    
    const activePointEventsBeforeSave = serializedData.bookkeeperState.activePoint?.events;
    const activePointEventsAfterLoad = newBookkeeper.serialize().bookkeeperState.activePoint?.events;
    expect(activePointEventsAfterLoad?.length).toBe(activePointEventsBeforeSave?.length);


    newBookkeeper.undo(); 
    expect(newBookkeeper.firstActor).toBe(PLAYER3); 
    expect(newBookkeeper.homePossession).toBe(true);
    expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave - 1);

    const currentPointEvents = newBookkeeper.serialize().bookkeeperState.activePoint?.events;
    expect(currentPointEvents?.length).toBe(1);
    expect(currentPointEvents?.[0].type).toBe(EventType.PASS);
  });
});
