import { describe, expect, beforeEach, afterAll, test } from 'vitest';
import { Bookkeeper } from '../bookkeeper';
import { EventType, League, Team, Event, GameModel, PointModel, SerializedGameData } from '../models';
import 'fake-indexeddb/auto';
import { db, StoredGame } from '../db';

const PLAYER1 = "Kevin Hughes";
const PLAYER2 = "Allan Godding";
const PLAYER3 = "Patrick Kenzie";

const mockLeague: League = { name: "OCUA", id: "101" };
const mockHomeTeam: Team = { name: "Team A", id: 1 };
const mockAwayTeam: Team = { name: "Team B", id: 2 };
const mockWeek = 1;

const homeLine = [PLAYER1, PLAYER3, "HP3", "HP4", "HP5", "HP6", "HP7"];
const awayLine = [PLAYER2, "AP2", "AP3", "AP4", "AP5", "AP6", "AP7"];


describe('Bookkeeper', () => {
    let bookkeeper: Bookkeeper;

    beforeEach(async () => {
        // Clear Dexie before each test to ensure a clean state
        await db.games.clear();
        bookkeeper = new Bookkeeper(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam, new GameModel());
        bookkeeper.recordActivePlayers(homeLine, awayLine);
    });

    afterAll(async () => {
        // Clean up Dexie after all tests are done
        await db.games.clear();
        db.close();
    });

    function verifyEventCount(expected: number) {
        expect(bookkeeper.activePoint).not.toBeNull();
        expect(bookkeeper.activePoint!.getEventCount()).toBe(expected);
    }

    function verifyEvent(event: Event, type: EventType, firstActor: string, secondActor?: string | null) {
        expect(event.type).toBe(type);
        expect(event.firstActor).toBe(firstActor);
        if (secondActor === undefined) { // Check if secondActor was intentionally omitted in the call to verifyEvent
             expect(event.secondActor === null || event.secondActor === undefined).toBe(true);
        } else { // secondActor is explicitly passed as null or a string to verifyEvent
            expect(event.secondActor).toBe(secondActor);
        }
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('string');
    }

    function recordPass() { // PLAYER1 (home) passes to PLAYER2 (home)
        // For this helper, assume PLAYER1 and PLAYER2 are on the same (home) team line
        const currentHomeLine = [PLAYER1, PLAYER2, PLAYER3, "HP4", "HP5", "HP6", "HP7"];
        bookkeeper.recordActivePlayers(currentHomeLine, awayLine);
        bookkeeper.recordFirstActor(PLAYER1, true); // Home player has disc
        bookkeeper.recordPass(PLAYER2);
    }


    test('testUndoRecordFirstActor', () => {
        bookkeeper.recordFirstActor(PLAYER1, true); // Home player starts with disc
        bookkeeper.undo();
        expect(bookkeeper.firstActor).toBeNull();
        expect(bookkeeper.activePoint).toBeNull();
    });

    test('testUndoPull', () => {
        bookkeeper.recordFirstActor(PLAYER1, true); // Home player (PLAYER1) pulling
        bookkeeper.recordPull();
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(0);
        expect(bookkeeper.firstActor).toBe(PLAYER1);
        expect(bookkeeper.homePossession).toBe(true); // Possession was home before pull action changed it
    });

    test('testUndoPass', () => {
        recordPass(); // PLAYER1 passes to PLAYER2
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(0);
        expect(bookkeeper.firstActor).toBe(PLAYER1);
    });

    test('testUndoPoint', () => {
        recordPass(); // PLAYER1 (home) passes to PLAYER2
        bookkeeper.recordPoint(); // PLAYER2 scores for home
        expect(bookkeeper.homeScore).toBe(1);
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(1); // Point event removed, pass event remains
        expect(bookkeeper.firstActor).toBe(PLAYER2);
        expect(bookkeeper.homeScore).toBe(0);
    });

    test('testUndoThrowAway', () => {
        bookkeeper.recordFirstActor(PLAYER1, true); // Home has disc
        bookkeeper.recordThrowAway();
        expect(bookkeeper.homePossession).toBe(false); // Away has disc
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(0);
        expect(bookkeeper.firstActor).toBe(PLAYER1);
        expect(bookkeeper.homePossession).toBe(true);
    });

    test('testUndoThrowAwayAfterPass', () => {
        recordPass(); // PLAYER1 (home) passes to PLAYER2
        bookkeeper.recordThrowAway(); // PLAYER2 (home) throws away
        expect(bookkeeper.homePossession).toBe(false);
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(1);
        expect(bookkeeper.firstActor).toBe(PLAYER2);
        expect(bookkeeper.homePossession).toBe(true);
    });

    test('testUndoD', () => {
        bookkeeper.recordFirstActor(PLAYER1, true); // Home has disc
        bookkeeper.recordThrowAway(); // Home throws away, Away should pick up
        bookkeeper.recordFirstActor(PLAYER2, false); // Away (PLAYER2) has disc
        bookkeeper.recordD(); // PLAYER2 (Away) gets a D (e.g., handblock on self, or teammate gets D)
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(1); // D removed, ThrowAway remains
        expect(bookkeeper.firstActor).toBe(PLAYER2);
    });

    test('testUndoCatchD', () => {
        bookkeeper.recordFirstActor(PLAYER1, true); // Home has disc
        bookkeeper.recordThrowAway(); // Home throws away
        bookkeeper.recordFirstActor(PLAYER2, false); // Away (PLAYER2) picks up
        bookkeeper.recordCatchD(); // PLAYER2 (Away) catches the D
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        verifyEventCount(1);
        expect(bookkeeper.firstActor).toBe(PLAYER2);
    });

    test('testComplexScenario from Java test', () => {
        // Re-setup for this specific scenario to match Java test's implied player movements
        bookkeeper = new Bookkeeper(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam, new GameModel());
        const complexHomeLine = [PLAYER1, PLAYER3]; // As per Java test, P3 acts for Home then Away
        const complexAwayLine = [PLAYER2, PLAYER3]; // P3 is also on away for receiving a pass
        bookkeeper.recordActivePlayers(complexHomeLine, complexAwayLine);


        //1. P2 (Away) has disc, to pull. Point starts. Away possession.
        bookkeeper.recordFirstActor(PLAYER2, false);
        //2. P2 (Away) pulls. Home possession. firstActor is null.
        bookkeeper.recordPull();
        //3. P1 (Home) picks up.
        bookkeeper.recordFirstActor(PLAYER1, true);
        //4. Undo P1 picks up. firstActor is null.
        bookkeeper.undo();
        //5. P3 (Home) picks up instead. firstActor is P3.
        bookkeeper.recordFirstActor(PLAYER3, true);
        //6. P3 (Home) passes to P2 (Home - this is PLAYER2 from Java test). firstActor is P2.
        //   To match Java test, PLAYER2 needs to be on home line for this pass.
        bookkeeper.recordActivePlayers([PLAYER1, PLAYER2, PLAYER3], complexAwayLine);
        bookkeeper.recordPass(PLAYER2);
        //7. P2 (Home) throws away. Away possession. firstActor is null.
        bookkeeper.recordThrowAway();
        //8. P2 (Away - original PLAYER2) picks up. firstActor is P2.
        bookkeeper.recordActivePlayers(complexHomeLine, complexAwayLine); // Reset lines
        bookkeeper.recordFirstActor(PLAYER2, false);
        //9. P2 (Away) gets a D (e.g., on a pass from teammate, or self). firstActor is P2.
        bookkeeper.recordCatchD(); // Using CatchD as it keeps P2 as firstActor
        //10. Undo CatchD. Event removed. firstActor is P2.
        bookkeeper.undo();
        //11. Undo P2 picks up. firstActor is null. Disc is loose after throwaway.
        bookkeeper.undo();
        //12. P1 (Home) gets a D on the loose disc. firstActor is P1 (Home). Home possession.
        bookkeeper.recordFirstActor(PLAYER1, true); // P1 is on D, this means P1 is initiating action
        bookkeeper.recordD(); // P1 gets the D. firstActor is null.
        //13. P2 (Away) picks up after P1's D. firstActor is P2. Away possession.
        bookkeeper.recordFirstActor(PLAYER2, false);
        //14. P2 (Away) passes to P3 (Away). firstActor is P3.
        bookkeeper.recordPass(PLAYER3);
        //15. P3 (Away) scores. Away score = 1.
        bookkeeper.recordPoint();
        expect(bookkeeper.awayScore).toBe(1);
        //16. Undo point. P3 (Away) has disc. Away score = 0.
        bookkeeper.undo();

        expect(bookkeeper.activePoint).not.toBeNull();
        const events = bookkeeper.activePoint!.events;
        expect(events.length).toBe(5);

        // Expected events from Java test:
        // PULL(P2), PASS(P3->P2), THROWAWAY(P2), DEFENSE(P1), PASS(P2->P3)
        verifyEvent(events[0], EventType.PULL, PLAYER2, null);
        verifyEvent(events[1], EventType.PASS, PLAYER3, PLAYER2);
        verifyEvent(events[2], EventType.THROWAWAY, PLAYER2, null);
        verifyEvent(events[3], EventType.DEFENSE, PLAYER1, null);
        verifyEvent(events[4], EventType.PASS, PLAYER2, PLAYER3);
        expect(bookkeeper.awayScore).toBe(0);
        expect(bookkeeper.firstActor).toBe(PLAYER3); // P3 (Away) has disc
    });

    test('should save and load game state with mementos via Dexie', async () => {
        // 1. Setup initial Bookkeeper state and perform actions
        bookkeeper.recordFirstActor(PLAYER1, true); // Home player starts
        recordPass(); // P1 to P2 (Home)
        bookkeeper.recordThrowAway(); // P2 (Home) throws away
        const mementosCountBeforeSave = bookkeeper.getMementosCount();
        const homeScoreBeforeSave = bookkeeper.homeScore;
        const awayScoreBeforeSave = bookkeeper.awayScore;
        const firstActorBeforeSave = bookkeeper.firstActor; // Should be null after throwaway

        // 2. Serialize Bookkeeper state
        const serializedData = bookkeeper.serialize();

        // 3. Create StoredGame object and save to Dexie
        const gameToStore: StoredGame = {
            league_id: serializedData.league_id,
            week: serializedData.week,
            homeTeam: serializedData.homeTeamName,
            homeScore: serializedData.bookkeeperState.homeScore,
            homeRoster: serializedData.bookkeeperState.homeParticipants,
            awayTeam: serializedData.awayTeamName,
            awayScore: serializedData.bookkeeperState.awayScore,
            awayRoster: serializedData.bookkeeperState.awayParticipants,
            points: serializedData.game.points.map(p => ({ // Convert PointModel to API Point
                offensePlayers: p.offensePlayers,
                defensePlayers: p.defensePlayers,
                events: p.events.map(e => ({
                    type: e.type.toString(),
                    firstActor: e.firstActor,
                    secondActor: e.secondActor || "", // API PointEvent expects string
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

        // 4. Retrieve from Dexie
        const retrievedGame = await db.games.get(storedId!);
        expect(retrievedGame).toBeDefined();
        expect(retrievedGame!.mementos).toBeDefined();
        expect(retrievedGame!.bookkeeperState).toBeDefined();

        // 5. Create a new Bookkeeper instance and hydrate it
        const hydratedSerializedData: SerializedGameData = {
            league_id: retrievedGame!.league_id,
            week: retrievedGame!.week,
            homeTeamName: retrievedGame!.homeTeam,
            awayTeamName: retrievedGame!.awayTeam,
            homeTeamId: mockHomeTeam.id, // Assuming we know this or store it
            awayTeamId: mockAwayTeam.id, // Assuming we know this or store it
            game: { points: retrievedGame!.points.map(p => PointModel.fromJSON(p as any)) }, // API Point to PointModel
            bookkeeperState: retrievedGame!.bookkeeperState!,
            mementos: retrievedGame!.mementos!,
        };

        const newBookkeeper = new Bookkeeper(mockLeague, mockWeek, mockHomeTeam, mockAwayTeam, hydratedSerializedData);

        // 6. Assertions
        expect(newBookkeeper.homeScore).toBe(homeScoreBeforeSave);
        expect(newBookkeeper.awayScore).toBe(awayScoreBeforeSave);
        expect(newBookkeeper.firstActor).toBe(firstActorBeforeSave); // null
        expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave);
        expect(newBookkeeper.activePoint).not.toBeNull(); // After a throwaway, activePoint is NOT null.
                                                      // It contains the events of the current point.
        expect(serializedData.bookkeeperState.activePoint?.events.length).toBe(2); // Pass, ThrowAway
        expect(newBookkeeper.serialize().bookkeeperState.activePoint?.events.length).toBe(2);


        // Try an undo on the new Bookkeeper
        newBookkeeper.undo(); // Undo the throwaway
        expect(newBookkeeper.firstActor).toBe(PLAYER2); // P2 had it before throwaway
        expect(newBookkeeper.homePossession).toBe(true);
        expect(newBookkeeper.getMementosCount()).toBe(mementosCountBeforeSave - 1);

        // Check if activePoint events are correct after undo
        const currentPointEvents = newBookkeeper.serialize().bookkeeperState.activePoint?.events;
        expect(currentPointEvents?.length).toBe(1);
        expect(currentPointEvents?.[0].type).toBe(EventType.PASS);
    });
});
