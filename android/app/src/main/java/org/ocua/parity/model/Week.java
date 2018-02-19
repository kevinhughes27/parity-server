package org.ocua.parity.model;

import java.text.SimpleDateFormat;
import java.util.Date;

public class Week {
    public final static int current() {
        Date now = new Date();
        return current(now);
    }

    public final static int current(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyy/MM/dd");
        String[] weeks = new String[]{
                "2018/02/12",
                "2018/02/19",
                "2018/02/26",
                "2018/03/5",
                "2018/03/12",
                "2018/03/19",
                "2018/03/26",
                "2018/04/2",
                "2018/04/9",
                "2018/04/16",
                "2018/04/23",
                "2018/04/30",
        };

        int week = 0;

        try {
            for(String dateStr: weeks) {
                Date gameDay = sdf.parse(dateStr);
                if (date.equals(gameDay) || date.after(gameDay)) {
                    week++;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return week;
    }
}
