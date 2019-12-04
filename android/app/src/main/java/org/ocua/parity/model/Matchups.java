package org.ocua.parity.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Date;
import java.util.Map;

public class Matchups {
    public static ArrayList<Matchup> load(JSONArray json) {
        ArrayList<Matchup> schedule = new ArrayList<Matchup>();

        try {
            for (int i = 0; i < json.length(); i++) {
                JSONObject matchupJson = json.getJSONObject(i);

                int gameSlot = matchupJson.getInt("game");
                int homeId = matchupJson.getInt("home_team");
                int awayId = matchupJson.getInt("away_team");

                schedule.add(new Matchup(gameSlot, homeId, awayId));
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

        options.add("Other");

        return options.toArray(new String[0]);
    }
}
