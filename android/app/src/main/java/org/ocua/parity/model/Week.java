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
                "2019/02/11",
                "2019/02/18",
                "2019/02/25",
                "2019/03/04",
                "2019/03/11",
                "2019/03/18",
                "2019/03/25",
                "2019/04/01",
                "2019/04/08",
                "2019/04/15",
                "2019/04/22",
                "2019/04/29",
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
