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
                "2018/11/05",
                "2018/11/12",
                "2018/11/19",
                "2018/11/26",
                "2018/12/03",
                "2018/12/10",
                "2018/12/17",
                "2019/01/07",
                "2019/01/14",
                "2019/01/21",
                "2019/01/28",
                "2019/02/04",
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
