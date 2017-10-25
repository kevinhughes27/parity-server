package io.masse.parityleaguestats.model;

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
                "2017/11/06",
                "2017/11/13",
                "2017/11/20",
                "2017/11/27",
                "2017/12/4",
                "2017/12/11",
                "2017/12/18",
                "2018/01/8",
                "2018/01/15",
                "2018/01/22",
                "2018/01/29",
                "2018/02/5",
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
