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

    public Boolean homePossession;
    public Integer homeScore;
    public Integer awayScore;

    public void startGame() {
        activeGame = new Game();
        homeScore = 0;
        awayScore = 0;
        homePossession = true;
        games.add(activeGame);
        mementos = new Stack<>();
    }

    private static final int autoState = 0;
    private static final int normalState = 1;
    private static final int firstDState = 2;
    private static final int startState = 3;
    private static final int pullState = 4;
    private static final int whoPickedUpDiscState = 5;
    private static final int halfState = 7;
    private static final int firstThrowQuebecVariantState = 8;
    private static final int firstActionState = 9;
    private static final int rosterChangeState = 10;

    public int uiState() {
        int state = autoState;

        Boolean firstPoint = (activeGame.getPointCount() == 0);
        Boolean firstEvent = (activePoint == null || activePoint.getEventCount() == 0);

        if (firstPoint && firstEvent && firstActor == null) {
            state = startState;
        } else if (firstPoint && firstEvent) {
            state = pullState;
        } else if (activePoint.getLastEventType() == Event.Type.PULL) {
            state = whoPickedUpDiscState;
        } else if (firstEvent && firstActor == null) {
            state = whoPickedUpDiscState;
        } else if (firstEvent) {
            state = firstThrowQuebecVariantState;
        } else {
            state = normalState;
        }

        return state;
    }

    public boolean shouldRecordNewPass() {
        return firstActor != null;
    }

    private void changePossession() {
        homePossession = !homePossession;
    }

    public void startPoint(List<String> homePlayers, List<String> awayPlayers) {
        List<String> offensePlayers;
        List<String> defensePlayers;

        if (homePossession) {
            offensePlayers = homePlayers;
            defensePlayers = awayPlayers;
        } else {
            offensePlayers = awayPlayers;
            defensePlayers = homePlayers;
        }

        activePoint = new Point(offensePlayers, defensePlayers);
    }

    public void recordFirstActor(String player, Boolean isHome) {
        mementos.push(new Memento(firstActor) {
            @Override
            public void apply() {
                firstActor = savedFirstActor;
            }
        });

        if (activePoint == null) {
            homePossession = isHome;
            activePoint = new Point();
        }
        firstActor = player;
    }

    // The pull is an edge case for possession; the team that starts with possession isn't actually on offense.
    // To fix this we call swapOffenseAndDefense on the activePoint
    public void recordPull() {
        // I think this means I can't undo pulls right now. Also does it work if away pulls?
        activePoint.swapOffenseAndDefense();
        changePossession();

        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.PULL, firstActor));
        firstActor = null;
    }

    public void recordThrowAway() {
        mementos.push(undoTurnoverMemento());

        changePossession();
        activePoint.addEvent(new Event(Event.Type.THROWAWAY, firstActor));
        firstActor = null;
    }

    public void recordPass(String receiver) {
        mementos.push(genericUndoLastEventMemento());

        activePoint.addEvent(new Event(Event.Type.PASS, firstActor, receiver));
        firstActor = receiver;
    }

    public void recordDrop() {
        mementos.push(undoTurnoverMemento());

        changePossession();
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
                if (homePossession) {
                    awayScore--;
                } else {
                    homeScore--;
                }
                changePossession();
                activePoint = activeGame.getLastPoint();
                activePoint.removeLastEvent();
                firstActor = savedFirstActor;
            }
        });

        activePoint.addEvent(new Event(Event.Type.POINT, firstActor));
        activeGame.addPoint(activePoint);
        if (homePossession) {
            homeScore++;
        } else {
            awayScore++;
        }

        changePossession();
        activePoint = new Point();
        firstActor = null;
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

    public Memento undoTurnoverMemento() {
        return new Memento(firstActor) {
            @Override
            public void apply() {
                activePoint.removeLastEvent();
                firstActor = savedFirstActor;
                changePossession();
            }
        };
    }

}
