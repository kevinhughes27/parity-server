package io.masse.parityleaguestats;


import com.google.gson.Gson;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import io.masse.parityleaguestats.model.Event;
import io.masse.parityleaguestats.model.Game;
import io.masse.parityleaguestats.model.Point;

public class Bookkeeper {

    private List<Game> games = new ArrayList<Game>();
    private Game activeGame;
    private Point activePoint;
    private String firstActor;

    public void startGame() {
        activeGame = new Game();
        games.add(activeGame);
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
        if (activePoint == null) {
            activePoint = new Point();
        }
        firstActor = player;
    }

    public void recordPull() {
        activePoint.addEvent(new Event(Event.Type.PULL, firstActor));
        firstActor = null;
    }

    public void recordThrowAway() {
        activePoint.addEvent(new Event(Event.Type.THROWAWAY, firstActor));
        firstActor = null;
    }

    public void recordPass(String receiver) {
        activePoint.addEvent(new Event(Event.Type.PASS, firstActor, receiver));
        firstActor = receiver;
    }

    public void recordDrop() {
        activePoint.addEvent(new Event(Event.Type.DROP, firstActor));
        firstActor = null;
    }

    public void recordD() {
        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
        firstActor = null;
    }

    public void recordCatchD() {
        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
        //firstActor remains the same
    }

    public void recordPoint() {
        activePoint.addEvent(new Event(Event.Type.POINT, firstActor));
        activeGame.addPoint(activePoint);
        activePoint = new Point();
        firstActor = null;
    }

    public void gameCompleted() {
        activePoint = null;
        firstActor = null;
    }

    public JSONObject serialize() {
        Gson gson = new Gson();
        String json = gson.toJson(activeGame);
        JSONObject jsonObject = new JSONObject();

        // suuuuper efficient ....
        try {
            jsonObject = new JSONObject(json);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return jsonObject;
    }

    public void undo() {
        if (lastEventWasRecordingFirstActor()) {
            //Handle the case of a pickup on change of possession
            firstActor = null;
            return;
        } else if (lastEventWasAGoal()) {
            undoGoal();
        } else if (lastEventWasADefense()) {
            undoDefense();
        } else {
            Event lastEvent = activePoint.removeLastEvent();
            if (lastEvent == null) {
                firstActor = null;
                return;
            }
            firstActor = lastEvent.getFirstActor();
        }
    }

    private void undoGoal() {
        activePoint = activeGame.getLastPoint();
        Event lastEvent = activePoint.removeLastEvent();
        firstActor = lastEvent.getFirstActor();
    }

    private void undoDefense() {
        //Doing this in its own method to highlight the fact that the
        //firstActor is cleared in this case, unlike some other cases
        activePoint.removeLastEvent();
        firstActor = null;
    }

    private boolean lastEventWasAGoal() {
        return activePoint.getEventCount() == 0 && activeGame.getPointCount() > 0;
    }

    private boolean lastEventWasADefense() {
        Event lastEvent = activePoint.getLastEvent();
        return lastEvent != null && lastEvent.getType() == Event.Type.DEFENSE;
    }

    /**
     * @return true if firstActor != null and firstActor was not the secondActor
     * in the last Event
     */
    private boolean lastEventWasRecordingFirstActor() {
        Event lastEvent = activePoint.getLastEvent();
        return firstActor != null && lastEvent != null && !firstActor.equals(lastEvent.getSecondActor());
    }

}
