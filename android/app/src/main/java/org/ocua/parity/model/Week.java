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
                "2019/11/04",
                "2019/11/11",
                "2019/11/18",
                "2019/11/25",
                "2019/12/02",
                "2019/12/09",
                "2019/12/16",
                "2020/01/06",
                "2020/01/13",
                "2020/01/20",
                "2020/01/27",
                "2020/02/03",
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
