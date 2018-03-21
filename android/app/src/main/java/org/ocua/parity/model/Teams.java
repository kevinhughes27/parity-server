package org.ocua.parity.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;

class TeamsLoadError extends RuntimeException {
    public TeamsLoadError(String msg) {
        super(msg);
    }
}

public class Teams implements Serializable {
    private ArrayList<Team> teamsArray = new ArrayList<>();

    public void load(JSONArray json) {
        try {
            for (int teamIndex = 0; teamIndex < json.length(); teamIndex++) {
                JSONObject teamObject = json.getJSONObject(teamIndex);

                String teamName = teamObject.getString("name");
                int teamId = teamObject.getInt("id");

                JSONArray teamPlayers = teamObject.getJSONArray("players");
                Team team = new Team(teamName, teamId);

                for (int playerIndex = 0; playerIndex < teamPlayers.length(); playerIndex++) {
                    JSONObject player = teamPlayers.getJSONObject(playerIndex);

                    String playerName = player.getString("name");
                    boolean isMale = player.getBoolean("is_male");
                    team.addRosterPlayer(playerName, isMale);
                }

                teamsArray.add(team);
            }

        } catch (Exception e) {
            throw new TeamsLoadError(e.getMessage());
        }
    }

    public ArrayList<String> allPlayers() {
        ArrayList<String> names = new ArrayList<>();

        for (int i = 0; i < teamsArray.size(); i++) {
            names.addAll(teamsArray.get(i).getRoster());
        }

        return names;
    }

    public Team getTeam(int teamNumber) {
        return teamsArray.get(teamNumber);
    }

    public Gender getPlayerGender(String playerName) {
        for (Team team : teamsArray) {
            if (team.arlGirls.contains(playerName)) {
                return Gender.Female;
            } else if (team.arlGuys.contains(playerName)) {
                return Gender.Male;
            }
        }

        return Gender.Unknown;
    }

    public String[] getNames() {
        String[] teamNames;
        int counter = 0;
        int intTeamSize = teamsArray.size();

        if (substituteExists()){
            teamNames = new String[teamsArray.size()-1];
        } else {
            teamNames = new String[teamsArray.size()];
        }

        for (int i = 0; i < intTeamSize; i++) {
            if (!teamsArray.get(i).name.equals("Substitute")){
                teamNames[counter] = teamsArray.get(i).name;
                counter++;
            }
        }

        return teamNames;
    }

    private boolean substituteExists() {
        int intTeamSize = teamsArray.size();
        for (int i = 0; i < intTeamSize; i++){
            if (teamsArray.get(i).name.equals("Substitute")){
                return true;
            }
        }
        return false;
    }
}
