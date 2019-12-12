package org.ocua.parity.model;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;

public class Matchup {
    public final int week;
    public final int gameSlot;
    public final int homeTeamId;
    public final int awayTeamId;

    public Matchup(int week, int gameSlot, int homeTeamId, int awayTeamId) {
        this.week = week;
        this.gameSlot = gameSlot;
        this.homeTeamId = homeTeamId;
        this.awayTeamId = awayTeamId;
    }

    public String description(Map<Integer, String> teamNames){
        String homeTeamName = teamNames.get(this.homeTeamId);
        String awayTeamName = teamNames.get(this.awayTeamId);

        return String.format("%d: %s vs %s", this.gameSlot, homeTeamName, awayTeamName);
    }
}
