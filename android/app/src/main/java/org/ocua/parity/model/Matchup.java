package org.ocua.parity.model;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;

public class Matchup {
    public final int week;
    public final int homeTeamId;
    public final int awayTeamId;
    public Date gameStart;
    public Date gameEnd;

    public Matchup(int week, int homeTeamId, int awayTeamId, String gameStart, String gameEnd) {
        this.week = week;
        this.homeTeamId = homeTeamId;
        this.awayTeamId = awayTeamId;
        SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd_HH:mm:ss");

        try {
            this.gameStart = parser.parse(gameStart);
            this.gameEnd = parser.parse(gameEnd);
        } catch (ParseException ex) {
            ex.printStackTrace();
            this.gameStart = new Date();
            this.gameEnd = new Date();
        }
    }

    public String description(Map<Integer, String> teamNames){
        String homeTeam = teamNames.get(this.homeTeamId);
        String awayTeam = teamNames.get(this.awayTeamId);

        SimpleDateFormat format = new SimpleDateFormat("HH:mm");

        String start = format.format(this.gameStart);
        String end = format.format(this.gameEnd);

        return String.format("%s-%s: %s vs %s", start, end, homeTeam, awayTeam);
    }
}
