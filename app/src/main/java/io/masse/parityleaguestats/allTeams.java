package io.masse.parityleaguestats;

import java.util.ArrayList;

public class allTeams {
    //TODO ensure teams get added Alphabetically, with substitute player team ALWAYS on the bottom
    private ArrayList<team> everyone = new ArrayList<team>();
    private String rosterName;

    public void addRosterName(String name){
        rosterName = name;
    }

    public String getRosterName(){
        return rosterName;
    }

    public void add (String teamName, String teamMember, Boolean isMale) {
        int intTeamSize = everyone.size();

        if (intTeamSize < 1){
            everyone.add(new team(teamName,teamMember,isMale));
        }else{
            boolean match = false;

            for (team oneteam: everyone) {
                if (oneteam.strTeamName.equals(teamName)){
                    match = true;
                    oneteam.add(teamMember, isMale);
                    break;
                }
            }
            //for (int i = 0; i < intTeamSize; i++){
            //    if (everyone.get(i).strTeamName.equals(teamName)){
            //        match = true;
            //        everyone.get(i).add(teamMember, isMale);
            //        break;
            //    }
            //}
            if (!match){
                everyone.add(new team(teamName,teamMember,isMale));
            }
        }
    }

    public int size(){
        return everyone.size();
    }

    public int sizeGuys(int teamNumber){
        return everyone.get(teamNumber).arlGuys.size();
    }

    public int sizeGirls(int teamNumber) {
        return everyone.get(teamNumber).arlGirls.size();
    }

    public String getTeamName(int teamNumber){
        return everyone.get(teamNumber).strTeamName;
    }

    public String getGuyName(int teamNumber, int playerNumber){
        return everyone.get(teamNumber).arlGuys.get(playerNumber);
    }

    public String getGirlName(int teamNumber, int playerNumber){
        return everyone.get(teamNumber).arlGirls.get(playerNumber);
    }

    public Gender getPlayerGender(String playerName) {
        for (team team : everyone) {
            if (team.arlGirls.contains(playerName)) {
                return Gender.Female;
            } else if (team.arlGuys.contains(playerName)) {
                return Gender.Male;
            }
        }

        return Gender.Unknown;
    }

    private boolean substituteExists(){
        int intTeamSize = size();
        for (int i = 0; i < intTeamSize; i++){
            if (everyone.get(i).strTeamName.equals("Substitute")){
                return true;
            }
        }
        return false;
    }

    public String[] getTeams(){
        String[] teamNames;
        int counter = 0;
        int intTeamSize = size();

        if (substituteExists()){
            teamNames = new String[size()-1];
        }else{
            teamNames = new String[size()];
        }
        for (int i = 0; i < intTeamSize; i++){
            if (!everyone.get(i).strTeamName.equals("Substitute")){
                teamNames[counter] = everyone.get(i).strTeamName;
                counter++;
            }
        }
        return teamNames;
    }

    public String[] getPlayers(int intTeamNumber){
        String[] players = new String[sizeGirls(intTeamNumber)+sizeGuys(intTeamNumber)];
        int counter = 0;

        for (int i = 0; i < sizeGirls(intTeamNumber); i++){
            players[counter] = everyone.get(intTeamNumber).arlGirls.get(i);
            counter++;
        }
        for (int i = 0; i < sizeGuys(intTeamNumber); i++){
            players[counter] = everyone.get(intTeamNumber).arlGuys.get(i);
            counter++;
        }
        return players;
    }

    public String[] getPlayers(String teamName){
        int intTeamNumber = teamNumberFromName(teamName);
        return getPlayers(intTeamNumber);
    }

    private int teamNumberFromName(String teamName) {
        for(int i = 0; i < everyone.size(); i++) {
            if(everyone.get(i).strTeamName == teamName) {
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
