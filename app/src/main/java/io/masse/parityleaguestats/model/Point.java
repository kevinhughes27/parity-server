package io.masse.parityleaguestats.model;


import java.util.ArrayList;
import java.util.List;

public class Point {

    private List<String> offensePlayers;
    private List<String> defensePlayers;
    private List<Event> events;

    public Point(List<String> offensePlayers, List<String> defensePlayers) {
        this();
        this.offensePlayers = offensePlayers;
        this.defensePlayers = defensePlayers;
    }

    public Point() {
        events = new ArrayList<Event>();
    }

    public void setPlayers(List<String> offensePlayers, List<String> defensePlayers) {
        this.offensePlayers = offensePlayers;
        this.defensePlayers = defensePlayers;
    }

    public void addEvent(Event event) {
        events.add(event);
    }
}
