package io.masse.parityleaguestats;

import android.support.test.runner.AndroidJUnit4;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import static junit.framework.Assert.assertEquals;
import static junit.framework.Assert.assertNull;
import static junit.framework.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class BookkeeperTest {

    private static final String PLAYER1 = "Kevin Hughes";
    private static final String PLAYER2 = "Allan Godding";

    private Bookkeeper bookkeeper;

    @Before
    public void before() {
        bookkeeper = new Bookkeeper();
        bookkeeper.startGame();
    }

    @Test
    public void testUndoRecordFirstActor() {
        bookkeeper.recordFirstActor(PLAYER1);
        bookkeeper.undo();

        assertNull(bookkeeper.firstActor);
    }

    @Test
    public void testUndoPull() {
        bookkeeper.recordFirstActor(PLAYER1);
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
        bookkeeper.recordFirstActor(PLAYER1);
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
        bookkeeper.recordFirstActor(PLAYER1);
        bookkeeper.recordThrowAway();
        bookkeeper.recordFirstActor(PLAYER2);
        bookkeeper.recordD();
        bookkeeper.undo();

        verifyEventCount(1);
        assertNull(bookkeeper.firstActor);
    }

    @Test
    public void testUndoCatchD() {
        bookkeeper.recordFirstActor(PLAYER1);
        bookkeeper.recordThrowAway();
        bookkeeper.recordFirstActor(PLAYER2);
        bookkeeper.recordCatchD();
        bookkeeper.undo();

        verifyEventCount(2);
        assertNull(bookkeeper.firstActor);
    }

    private void verifyEventCount(int expected) {
        assertTrue(bookkeeper.activePoint.getEventCount() == expected);
    }

    private void recordPass() {
        bookkeeper.recordFirstActor(PLAYER1);
        bookkeeper.recordPass(PLAYER2);
    }
}
