package io.masse.parityleaguestats.model;


import java.util.Date;

public class Event {

    public enum Type {
        PULL,
        PASS,
        POINT,
        DEFENSE,
        THROWAWAY,
        DROP
    }

    private Type type;
    private String firstActor;
    private String secondActor;
    private Date timestamp;

    public Event(Type type, String firstActor, String secondActor) {
        this.type = type;
        this.firstActor = firstActor;
        this.secondActor = secondActor;
        timestamp = new Date();
    }

    public Event(Type type, String firstActor) {
        this(type, firstActor, null);
    }

    public String getFirstActor() {
        return firstActor;
    }

    public String getSecondActor() {
        return secondActor;
    }

    public Type getType() {
        return type;
    }

    @Override
    public String toString() {
        return type.toString() + ", " + firstActor + ", " + secondActor;
    }
}
