package org.ocua.parity.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Date;
import java.util.Map;

public class Matchups {
    public static ArrayList<Matchup> load(JSONArray json) {
        ArrayList<Matchup> schedule = new ArrayList<>();

        try {
            for (int i = 0; i < json.length(); i++) {
                JSONObject matchupJson = json.getJSONObject(i);

                int week = matchupJson.getInt("week");
                int homeId = matchupJson.getInt("home_team");
                int awayId = matchupJson.getInt("away_team");
                String start = matchupJson.getString("game_start");
                String end = matchupJson.getString("game_end");

                schedule.add(new Matchup(week, homeId, awayId, start, end));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }

        return schedule;
    }

    public static String[] matchupList(ArrayList<Matchup> games, Map<Integer, String> teamNames) {
        ArrayList<String> options = new ArrayList<>();

        for (int i = 0; i < games.size(); i++) {
            options.add(games.get(i).description(teamNames));
        }

        options.add("Other Matchup");

        return options.toArray(new String[0]);
    }
}
