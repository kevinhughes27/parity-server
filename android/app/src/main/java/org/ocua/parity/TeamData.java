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

        data.addPlayer("Abby Millar");
        data.addPlayer("Ainsley Shannon");
        data.addPlayer("Alicia Racine");
        data.addPlayer("Alisha Zhao");
        data.addPlayer("Allison Flynn");
        data.addPlayer("Allison Verney");
        data.addPlayer("Anika Gnaedinger");
        data.addPlayer("Brianna Jaffray");
        data.addPlayer("Brittney Cooke");
        data.addPlayer("Cassandra Jaffray");
        data.addPlayer("Danielle Cantal");
        data.addPlayer("Emily Scott");
        data.addPlayer("Galadrielle Michaud");
        data.addPlayer("Hannah Dawson");
        data.addPlayer("Hannah Lewis");
        data.addPlayer("Jessie Robinson");
        data.addPlayer("Julie Boisvert");
        data.addPlayer("Kate Achtell");
        data.addPlayer("Kristie Ellis");
        data.addPlayer("Marie-Eve Gauvin");
        data.addPlayer("Marti Doucet");
        data.addPlayer("Marie-Christine Jacques");
        data.addPlayer("Sam Green");
        data.addPlayer("Steph Mandal");
        data.addPlayer("Taylor Stanojev");
        data.addPlayer("Wynne Gee");

        return data;
    }
}
