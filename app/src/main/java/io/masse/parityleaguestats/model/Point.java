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

    public Integer size() {
        return events.size();
    }

    public void addEvent(Event event) {
        events.add(event);
    }

    public Event removeLastEvent() {
        if (events.size() > 0) {
            return events.remove(events.size() - 1);
        }
        return null;
    }

    public Event getLastEvent() {
        if (events.size() > 0) {
            return events.get(events.size() - 1);
        }
        return null;
    }

    public int getEventCount() {
        return events.size();
    }

    public List<Event> getEvents() {
        return events;
    }

    @Override
    public String toString() {
        StringBuilder builder = new StringBuilder();
        for (Event event : events) {
            builder.append(event).append("\n");
        }
        return builder.toString();
    }

    public List<String> prettyPrint() {
        ArrayList<String> eventList = new ArrayList<>(events.size());
        for (Event event : events) {
            eventList.add(event.prettyPrint());
        }
        return eventList;
    }
}
