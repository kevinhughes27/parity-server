package org.ocua.parity.model;

import java.util.ArrayList;
import java.io.Serializable;
import java.util.HashSet;

public class Team implements Serializable {
    public String name = "";
    public final int id;

    public ArrayList<String> arlGuys = new ArrayList<>();
    public ArrayList<String> arlGirls = new ArrayList<>();

    private HashSet<String> roster = new HashSet<>();

    public Team(String teamName, int teamId) {
        this.name = teamName;
        this.id = teamId;
    }

    public Team deepCopy() {
        Team newTeam = new Team(this.name,  this.id);
        for(String player : this.arlGuys) {
            newTeam.addRosterPlayer(player, true);
        }

        for(String player : this.arlGirls) {
            newTeam.addRosterPlayer(player, false);
        }

        return newTeam;
    }

    public void addPlayer(String playerName, Gender gender){
        if (gender == Gender.Male){
            arlGuys.add(playerName);
        } else {
            arlGirls.add(playerName);
        }
    }

    public void addRosterPlayer(String playerName, Boolean isMale){
        addPlayer(playerName, isMale ? Gender.Male : Gender.Female);
        roster.add(playerName);
    }

    public void removePlayer(String playerName, Boolean isMale) {
        if (isMale) {
            arlGuys.remove(playerName);
        } else {
            arlGirls.remove(playerName);
        }
    }

    public boolean isOnRoster(String playerName) {
        return roster.contains(playerName);
    }

    public ArrayList<String> getRoster(){
        ArrayList<String> names = new ArrayList<>();

        for (int i = 0; i < sizeGirls(); i++){
            names.add(arlGirls.get(i));
        }

        for (int i = 0; i < sizeGuys(); i++){
            names.add(arlGuys.get(i));
        }

        return names;
    }

    public int sizeGuys(){
        return arlGuys.size();
    }

    public int sizeGirls() {
        return arlGirls.size();
    }

    public String getGuyName(int playerNumber){
        return arlGuys.get(playerNumber);
    }

    public String getGirlName(int playerNumber){
        return arlGirls.get(playerNumber);
    }
}
