package io.masse.parityleaguestats.model;

import java.text.SimpleDateFormat;
import java.util.Date;

public class Week {
    public final static int current() {
        Date now = new Date();
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyy");
        String[] weeks = new String[]{"2017/10/06", "2017/10/13", "2017/10/20"};

        int week = 0;

        try {
            for(String dateStr: weeks) {
                if (now.after(sdf.parse(dateStr))) {
                    week++;
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return week;
    }
}
