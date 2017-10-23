package io.masse.parityleaguestats;

import org.junit.Before;
import org.junit.Test;

import java.util.List;

import io.masse.parityleaguestats.model.Event;
import io.masse.parityleaguestats.model.Team;

import static junit.framework.Assert.assertEquals;
import static junit.framework.Assert.assertNull;

//@RunWith(AndroidJUnit4.class)
public class BookkeeperTest {

    private static final String PLAYER1 = "Kevin Hughes";
    private static final String PLAYER2 = "Allan Godding";
    private static final String PLAYER3 = "Patrick Kenzie";

    private Bookkeeper bookkeeper;
    private Team home;
    private Team away;

    @Before
    public void before() {
        home = new Team("Team A", PLAYER1, true);
        away = new Team("Team B", PLAYER2, true);
        bookkeeper = new Bookkeeper(home, away);
        bookkeeper.startGame();
    }

    @Test
    public void testUndoRecordFirstActor() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.undo();

        assertNull(bookkeeper.firstActor);
    }

    @Test
    public void testUndoPull() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordPull();
        bookkeeper.undo();

        verifyEventCount(0);
        assertEquals(PLAYER1, bookkeeper.firstActor);
    }

    @Test
    public void testUndoPass() {
        recordPass();
        bookkeeper.undo();

        verifyEventCount(0);
        assertEquals(PLAYER1, bookkeeper.firstActor);
    }

    @Test
    public void testUndoPoint() {
        recordPass();
        bookkeeper.recordPoint();
        bookkeeper.undo();

        verifyEventCount(1);
        assertEquals(PLAYER2, bookkeeper.firstActor);
    }

    @Test
    public void testUndoThrowAway() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordThrowAway();
        bookkeeper.undo();

        verifyEventCount(0);
        assertEquals(PLAYER1, bookkeeper.firstActor);
    }

    @Test
    public void testUndoThrowAwayAfterPass() {
        recordPass();
        bookkeeper.recordThrowAway();
        bookkeeper.undo();

        verifyEventCount(1);
        assertEquals(PLAYER2, bookkeeper.firstActor);
    }

    @Test
    public void testUndoD() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordThrowAway();
        bookkeeper.recordFirstActor(PLAYER2, false);
        bookkeeper.recordD();
        bookkeeper.undo();

        verifyEventCount(1);
        assertEquals(PLAYER2, bookkeeper.firstActor);
    }

    @Test
    public void testUndoCatchD() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordThrowAway();
        bookkeeper.recordFirstActor(PLAYER2, false);
        bookkeeper.recordCatchD();
        bookkeeper.undo();

        verifyEventCount(1);
        assertEquals(PLAYER2, bookkeeper.firstActor);
    }

    @Test
    public void testComplexScenario() {
        bookkeeper.recordFirstActor(PLAYER2, false);
        bookkeeper.recordPull();
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.undo();
        bookkeeper.recordFirstActor(PLAYER3, true);
        bookkeeper.recordPass(PLAYER2);
        bookkeeper.recordThrowAway();
        bookkeeper.recordFirstActor(PLAYER2, false);
        bookkeeper.recordCatchD();
        bookkeeper.undo();   //undo set first actor
        bookkeeper.undo();   //undo D
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordD();
        bookkeeper.recordFirstActor(PLAYER2, false);
        bookkeeper.recordPass(PLAYER3);
        bookkeeper.recordPoint();
        bookkeeper.undo();

        verifyComplexScenarioEvents();
    }

    private void verifyComplexScenarioEvents() {
        verifyEventCount(5);
        List<Event> events = bookkeeper.activePoint.getEvents();

        verifyEvent(events.get(0), Event.Type.PULL, PLAYER2, null);
        verifyEvent(events.get(1), Event.Type.PASS, PLAYER3, PLAYER2);
        verifyEvent(events.get(2), Event.Type.THROWAWAY, PLAYER2, null);
        verifyEvent(events.get(3), Event.Type.DEFENSE, PLAYER1, null);
        verifyEvent(events.get(4), Event.Type.PASS, PLAYER2, PLAYER3);
    }

    private void verifyEvent(Event event, Event.Type type, String firstActor, String secondActor) {
        assertEquals(type, event.getType());
        assertEquals(firstActor, event.getFirstActor());
        assertEquals(secondActor, event.getSecondActor());
    }

    private void verifyEventCount(int expected) {
        assertEquals(expected, bookkeeper.activePoint.getEventCount());
    }

    private void recordPass() {
        bookkeeper.recordFirstActor(PLAYER1, true);
        bookkeeper.recordPass(PLAYER2);
    }
}
