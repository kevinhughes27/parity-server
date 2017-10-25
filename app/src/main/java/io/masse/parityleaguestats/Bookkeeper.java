package io.masse.parityleaguestats;


import com.google.gson.Gson;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

import io.masse.parityleaguestats.model.Event;
import io.masse.parityleaguestats.model.Game;
import io.masse.parityleaguestats.model.Point;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.League;

public class Bookkeeper implements Serializable {
    Team homeTeam;
    Team awayTeam;

    private List<String> homePlayers;
    private List<String> awayPlayers;

    private Game activeGame;
    private Stack<Memento> mementos;

    Point activePoint;
    String firstActor;

    public Boolean homePossession;
    public Integer homeScore;
    public Integer awayScore;

    public void startGame(Team leftTeam, Team rightTeam) {
        activeGame = new Game();
        homeTeam = leftTeam;
        awayTeam = rightTeam;
        homeScore = 0;
        awayScore = 0;
        homePossession = true;
        mementos = new Stack<>();
    }

    private int state = normalState;
    private static final int normalState = 1;
    private static final int firstDState = 2;
    private static final int startState = 3;
    private static final int pullState = 4;
    private static final int whoPickedUpDiscState = 5;
    private static final int firstThrowQuebecVariantState = 6;

    public int gameState() {
        Boolean firstPoint = (activeGame.getPointCount() == 0);
        Boolean firstEvent = (activePoint == null || activePoint.getEventCount() == 0);

        if (activePoint == null) {
            state = startState;
        } else if (firstPoint && firstEvent && firstActor == null) {
            state = startState;
        } else if (firstPoint && firstEvent) {
            state = pullState;
        } else if (activePoint.getLastEventType() == Event.Type.PULL && firstActor == null) {
            state = whoPickedUpDiscState;
        } else if (activePoint.getLastEventType() == Event.Type.PULL) {
            state = firstThrowQuebecVariantState;
        } else if (firstEvent && firstActor == null) {
            state = whoPickedUpDiscState;
        } else if (firstEvent) {
            state = firstThrowQuebecVariantState;
        } else if (activePoint.getLastEventType() == Event.Type.THROWAWAY) {
            state = firstDState;
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

    public void recordFirstActor(String player, Boolean isHome) {
        mementos.push(new Memento(firstActor) {
            @Override
            public void apply() {
                firstActor = savedFirstActor;
                if (activePoint.getEventCount() == 0) {
                    activePoint = null;
                }
            }
        });

        if (activePoint == null) {
            homePossession = isHome;

            List<String> offensePlayers;
            List<String> defensePlayers;

            if (isHome) {
                offensePlayers = homePlayers;
                defensePlayers = awayPlayers;
            } else {
                offensePlayers = awayPlayers;
                defensePlayers = homePlayers;
            }

            activePoint = new Point(offensePlayers, defensePlayers);
        }

        firstActor = player;
    }

    public void recordActivePlayers(List<String> activeHomePlayers, List<String> activeAwayPlayers) {
        homePlayers = activeHomePlayers;
        awayPlayers = activeAwayPlayers;
    }

    // The pull is an edge case for possession; the team that starts with possession isn't actually on offense.
    // To fix this we call swapOffenseAndDefense on the activePoint
    public void recordPull() {
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
        mementos.push(genericUndoLastEventMemento());

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

    public void recordHalf() {
        // needs conditional logic
        changePossession();
    }

    public void gameCompleted() {
        activePoint = null;
        firstActor = null;
    }

    public JSONObject serialize() {
        JSONObject jsonObject = new JSONObject();

        try {
            jsonObject.accumulate("league", League.name);

            // server will calc the week for now.
            // it would be nice if the client knew what
            // week it was working for though.
            //jsonObject.accumulate("week", 1);

            // Teams
            JSONObject teams = new JSONObject();
            teams.accumulate(homeTeam.name, new JSONArray(awayTeam.getRoster()));
            teams.accumulate(homeTeam.name, new JSONArray(awayTeam.getRoster()));
            jsonObject.accumulate("teams", teams);

            // Score
            JSONObject score = new JSONObject();
            score.accumulate(homeTeam.name, homeScore.toString());
            score.accumulate(awayTeam.name, awayScore.toString());
            jsonObject.accumulate("score", score);

            // Points
            Gson gson = new Gson();
            jsonObject.accumulate("points", gson.toJson(activeGame));
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

    public List undoHistory() {
        if (activePoint != null) {
            return activePoint.prettyPrint();
        } else {
            return new ArrayList<>(0);
        }
    }

    private abstract class Memento implements Serializable {

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
