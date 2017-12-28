package org.ocua.parity;

import org.junit.Before;
import org.junit.Test;

import java.text.SimpleDateFormat;
import java.util.Date;

import org.ocua.parity.model.Week;

import static junit.framework.Assert.assertEquals;

//@RunWith(AndroidJUnit4.class)
public class WeekTest {

    private SimpleDateFormat sdf;

    @Before
    public void before() {
        sdf = new SimpleDateFormat("yyy/MM/dd");
    }

    @Test
    public void testWeekOneDayBefore() {
        Date date = mockDate("2017/11/05");
        assertEquals(0 ,Week.current(date));
    }

    @Test
    public void testWeekOneDayOf() {
        Date date = mockDate("2017/11/06");
        assertEquals(1, Week.current(date));
    }

    @Test
    public void testWeekOneDayAfter() {
        Date date = mockDate("2017/11/07");
        assertEquals(1, Week.current(date));
    }

    @Test
    public void testWeekTwoDayOf() {
        Date date = mockDate("2017/11/13");
        assertEquals(2, Week.current(date));
    }

    private Date mockDate(String str) {
        Date date;

        try {
            date = sdf.parse(str);
        } catch (Exception e) {
            date = new Date();
        }

        return date;
    }
}
