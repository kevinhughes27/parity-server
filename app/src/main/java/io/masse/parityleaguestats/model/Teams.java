package io.masse.parityleaguestats.model;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;

public class Teams {
    private ArrayList<team> teamsArray = new ArrayList<team>();

    // Roster Schema:
    // https://parity-server.herokuapp.com/docs/#api-Teams-GetTeams
    public void load(String filename) {
        // Load JSON string
        String jsonString = null;
        try {
            BufferedReader reader = new BufferedReader(new FileReader(filename));
            StringBuilder sb = new StringBuilder();

            String line = null;
            while ((line = reader.readLine()) != null)
            {
                sb.append(line + "\n");
            }
            jsonString = sb.toString();
        }
        catch (Exception e) {
            return;
        }

        // Parse JSON object
        try {
            JSONObject responseObject = new JSONObject(jsonString);
            Iterator<String> iter = responseObject.keys();

            while(iter.hasNext()) {
                String teamName = iter.next();
                JSONObject teamObject = responseObject.getJSONObject(teamName);
                JSONArray malePlayers = teamObject.getJSONArray("malePlayers");
                JSONArray femalePlayers = teamObject.getJSONArray("femalePlayers");

                for( int i = 0; i < malePlayers.length(); i++) {
                    addPlayer(teamName, malePlayers.getString(i), true);
                }

                for( int i = 0; i < femalePlayers.length(); i++) {
                    addPlayer(teamName, femalePlayers.getString(i), false);
                }
            }

        } catch (Exception e) {
            return;
        }
    }

    private void addPlayer(String teamName, String teamMember, Boolean isMale) {
        if (teamsArray.isEmpty()) {
            teamsArray.add(new team(teamName, teamMember, isMale));
        } else {
            boolean match = false;

            for (team oneteam: teamsArray) {
                if (oneteam.strTeamName.equals(teamName)){
                    match = true;
                    oneteam.add(teamMember, isMale);
                    break;
                }
            }

            if (!match){
                teamsArray.add(new team(teamName, teamMember, isMale));
            }
        }
    }

    public ArrayList<String> allPlayers() {
        ArrayList<String> names = new ArrayList<String>();

        for (int i = 0; i < teamsArray.size(); i++) {
            names.addAll(Arrays.asList(getPlayers(i)));
        }

        return names;
    }

    public int sizeGuys(int teamNumber){
        return teamsArray.get(teamNumber).arlGuys.size();
    }

    public int sizeGirls(int teamNumber) {
        return teamsArray.get(teamNumber).arlGirls.size();
    }

    public String getTeamName(int teamNumber){
        return teamsArray.get(teamNumber).strTeamName;
    }

    public String getGuyName(int teamNumber, int playerNumber){
        return teamsArray.get(teamNumber).arlGuys.get(playerNumber);
    }

    public String getGirlName(int teamNumber, int playerNumber){
        return teamsArray.get(teamNumber).arlGirls.get(playerNumber);
    }

    public Gender getPlayerGender(String playerName) {
        for (team team : teamsArray) {
            if (team.arlGirls.contains(playerName)) {
                return Gender.Female;
            } else if (team.arlGuys.contains(playerName)) {
                return Gender.Male;
            }
        }

        return Gender.Unknown;
    }

    private boolean substituteExists(){
        int intTeamSize = teamsArray.size();
        for (int i = 0; i < intTeamSize; i++){
            if (teamsArray.get(i).strTeamName.equals("Substitute")){
                return true;
            }
        }
        return false;
    }

    public String[] getTeams(){
        String[] teamNames;
        int counter = 0;
        int intTeamSize = teamsArray.size();

        if (substituteExists()){
            teamNames = new String[teamsArray.size()-1];
        }else{
            teamNames = new String[teamsArray.size()];
        }
        for (int i = 0; i < intTeamSize; i++){
            if (!teamsArray.get(i).strTeamName.equals("Substitute")){
                teamNames[counter] = teamsArray.get(i).strTeamName;
                counter++;
            }
        }
        return teamNames;
    }

    public String[] getPlayers(int intTeamNumber){
        String[] players = new String[sizeGirls(intTeamNumber)+sizeGuys(intTeamNumber)];
        int counter = 0;

        for (int i = 0; i < sizeGirls(intTeamNumber); i++){
            players[counter] = teamsArray.get(intTeamNumber).arlGirls.get(i);
            counter++;
        }
        for (int i = 0; i < sizeGuys(intTeamNumber); i++){
            players[counter] = teamsArray.get(intTeamNumber).arlGuys.get(i);
            counter++;
        }
        return players;
    }

    public String[] getPlayers(String teamName){
        int intTeamNumber = teamNumberFromName(teamName);
        return getPlayers(intTeamNumber);
    }

    private int teamNumberFromName(String teamName) {
        for(int i = 0; i < teamsArray.size(); i++) {
            if(teamsArray.get(i).strTeamName == teamName) {
                return i;
            }
        }

        return -1;
    }

    private class team {
        public String strTeamName = "";
        public ArrayList<String> arlGuys = new ArrayList<String>();
        public ArrayList<String> arlGirls = new ArrayList<String>();

        public team(String teamName, String teamMember, Boolean isMale){
            strTeamName = teamName;
            if (isMale){
                arlGuys.add(teamMember);
            }else{
                arlGirls.add(teamMember);
            }
        }

        public void add(String teamMember, Boolean isMale){
            if (isMale){
                arlGuys.add(teamMember);
            }else{
                arlGirls.add(teamMember);
            }
        }

    }
}
