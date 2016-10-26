package io.masse.parityleaguestats;


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
        activePoint = new Point(offensePlayers, defensePlayers);
    }

    public void recordFirstActor(String player) {
        firstActor = player;
    }

    public void recordPull() {
        activePoint.addEvent(new Event(Event.Type.PULL, firstActor));
    }

    public void recordThrowAway() {
        activePoint.addEvent(new Event(Event.Type.THROWAWAY, firstActor));
    }

    public void recordPass(String receiver) {
        activePoint.addEvent(new Event(Event.Type.PASS, firstActor, receiver));
        firstActor = receiver;
    }

    public void recordDrop() {
        activePoint.addEvent(new Event(Event.Type.DROP, firstActor));
    }

    public void recordD() {
        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
    }

    public void recordCatchD() {
        activePoint.addEvent(new Event(Event.Type.DEFENSE, firstActor));
    }

    public void recordPoint() {
        activePoint.addEvent(new Event(Event.Type.POINT, firstActor));
        activeGame.addPoint(activePoint);
    }

    public void gameCompleted() {
        //TODO: upload the current game?
        //Clear any references to ongoing state from the current game, just in case
        activePoint = null;
        firstActor = null;
        startGame();
    }
}
