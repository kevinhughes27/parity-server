package io.masse.parityleaguestats;


import com.google.gson.Gson;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

import io.masse.parityleaguestats.model.Event;
import io.masse.parityleaguestats.model.Game;
import io.masse.parityleaguestats.model.Point;

public class Bookkeeper {

    private List<Game> games = new ArrayList<>();
    private Game activeGame;
    private Stack<Memento> mementos;
    Point activePoint;
    String firstActor;

    public Integer homeScore;
    public Integer awayScore;

    public void startGame() {
        activeGame = new Game();
        homeScore = 0;
        awayScore = 0;
        games.add(activeGame);
        mementos = new Stack<>();
    }

    public Integer size() {
        return mementos.size();
    }

    public boolean startOfHalf() {
        return activePoint.size() < 1;
    }

    public boolean previousEventEquals(String type) {

        return true;
    }

    public boolean shouldRecordNewPass() {
        return firstActor != null;
//        Event lastEvent = activePoint.getLastEvent();
//        if (lastEvent.getType() == Event.Type.PULL) {
//            return false;
//        } else {
//            return true;
//        }
    }

    public void recordActivePlayers(List<String> offensePlayers, List<String> defensePlayers) {
        if (activeGame == null) {
            startGame();
        }
        if (activePoint == null) {
            activePoint = new Point(offensePlayers, defensePlayers);
        } else {
            activePoint.setPlayers(offensePlayers, defensePlayers);
        }
    }

    public void recordFirstActor(String player) {
        mementos.push(new Memento(firstActor) {
            @Override
            public void apply() {
                firstActor = savedFirstActor;
            }
        });

        if (activePoint == null) {
            activePoint = new Point();
        }
        firstActor = player;
    }

    public void recordPull() {
        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.PULL, firstActor));
        firstActor = null;
    }

    public void recordThrowAway() {
        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.THROWAWAY, firstActor));
        firstActor = null;
    }

    public void recordPass(String receiver) {
        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.PASS, firstActor, receiver));
        firstActor = receiver;
    }

    public void recordDrop() {
        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.DROP, firstActor));
        firstActor = null;
    }

    public void recordD() {
        mementos.push(new Memento() {
            @Override
            public void apply() {
                activePoint.removeLastEvent();
                firstActor = null;
            }
        });

        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
        firstActor = null;
    }

    public void recordCatchD() {
        mementos.push(new Memento() {
            @Override
            public void apply() {
                activePoint.removeLastEvent();
            }
        });
        mementos.push(new Memento() {
            @Override
            public void apply() {
                firstActor = null;
            }
        });

        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
        //firstActor remains the same
    }

    public void recordPoint() {
        mementos.add(new Memento(firstActor) {
            @Override
            public void apply() {
                activePoint = activeGame.getLastPoint();
                activePoint.removeLastEvent();
                firstActor = savedFirstActor;
            }
        });

        activePoint.addEvent(new Event(Event.Type.POINT, firstActor));
        activeGame.addPoint(activePoint);
        activePoint = new Point();
        firstActor = null;
    }

    public void recordHalf() {

    }

    public void gameCompleted() {
        activePoint = null;
        firstActor = null;
    }

    public Point getActivePoint() {
        return activePoint;
    }

    public JSONObject serialize() {
        Gson gson = new Gson();
        String json = gson.toJson(activeGame);
        JSONObject jsonObject = new JSONObject();

        try {
            jsonObject = new JSONObject(json);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return jsonObject;
    }

    public void backup() {
        return;
    }

    public void undo() {
        if (!mementos.isEmpty()) {
            mementos.pop().apply();
        }
    }

    private abstract class Memento {

        protected String savedFirstActor;

        public Memento(String savedFirstActor) {
            this.savedFirstActor = savedFirstActor;
        }

        public Memento() {}

        public abstract void apply();
    }

    public Memento genericUndoLastEventMemento() {
        return new Memento(firstActor) {
            @Override
            public void apply() {
                activePoint.removeLastEvent();
                firstActor = savedFirstActor;
            }
        };
    }

}
