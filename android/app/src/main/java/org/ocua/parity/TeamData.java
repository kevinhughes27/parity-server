package org.ocua.parity;

import org.ocua.parity.model.Gender;

import java.util.ArrayList;

/**
 * Created by kenzie on 10/05/18.
 */

public class TeamData {
    public final String teamName;
    public final Gender gender;
    public ArrayList<String> players = new ArrayList<>();

    public TeamData(String teamName, Gender gender){
        this.teamName = teamName;
        this.gender = gender;
    }

    public void addPlayer(String playerName) {
        this.players.add(playerName);
    }

    public static TeamData Stella() {
        TeamData data = new TeamData("Stella", Gender.Female);

        data.addPlayer("Hannah Dawson");
        data.addPlayer("Alisha Zhao");
        data.addPlayer("Stella 1");
        data.addPlayer("Stella 2");
        data.addPlayer("Stella 3");
        data.addPlayer("Stella 4");
        data.addPlayer("Stella 5");
        data.addPlayer("Stella 6");
        data.addPlayer("Stella 7");

        return data;
    }
}
