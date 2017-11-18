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
import io.masse.parityleaguestats.model.League;
import io.masse.parityleaguestats.model.Point;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Week;

public class Bookkeeper implements Serializable {
    Team homeTeam;
    Team awayTeam;

    List<String> homePlayers;
    List<String> awayPlayers;

    private Game activeGame;
    private Stack<Memento> mementos;

    Point activePoint;
    String firstActor;

    public Boolean homePossession;
    public Integer homeScore;
    public Integer awayScore;

    private int pointsAtHalf;

    public void startGame(Team leftTeam, Team rightTeam) {
        activeGame = new Game();
        homeTeam = leftTeam;
        awayTeam = rightTeam;
        homeScore = 0;
        awayScore = 0;
        pointsAtHalf = 0;
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
        Boolean firstPoint = (activeGame.getPointCount() == pointsAtHalf);
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

        } else if (activePoint.getLastEventType() == Event.Type.THROWAWAY && firstActor != null) {
            state = firstDState;

        } else if (activePoint.getLastEventType() == Event.Type.THROWAWAY) {
            state = whoPickedUpDiscState;

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
                    activePoint = null; // undo the created point
                }
            }
        });

        if (activePoint == null) {
            startPoint(isHome);
        }

        firstActor = player;
    }

    private void startPoint(Boolean isHome) {
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

    public void recordActivePlayers(List<String> activeHomePlayers, List<String> activeAwayPlayers) {
        homePlayers = activeHomePlayers;
        awayPlayers = activeAwayPlayers;
    }

    // The pull is an edge case for possession; the team that starts with possession isn't actually on offense.
    // To fix this we call swapOffenseAndDefense on the activePoint
    public void recordPull() {
        mementos.push(new Memento(firstActor) {
            @Override
            public void apply() {
                activePoint.swapOffenseAndDefense();
                changePossession();
                activePoint.removeLastEvent();
                firstActor = savedFirstActor;
            }
        });

        activePoint.swapOffenseAndDefense();
        changePossession();

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
        mementos.add(new Memento(firstActor, homePlayers, awayPlayers) {
            @Override
            public void apply() {
                if (homePossession) {
                    homeScore--;
                } else {
                    awayScore--;
                }

                activePoint = activeGame.popPoint();
                activePoint.removeLastEvent();
                homePlayers = savedHomePlayers;
                awayPlayers = savedAwayPlayers;
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

        activePoint = null;
        homePlayers = null;
        awayPlayers = null;
        firstActor = null;
    }

    public void recordHalf() {
        mementos.add(new Memento(firstActor) {
            @Override
            public void apply() {
                pointsAtHalf = 0;
            }
        });

        pointsAtHalf = activeGame.getPointCount();
    }

    public JSONObject serialize() {
        JSONObject jsonObject = new JSONObject();

        try {
            jsonObject.accumulate("league", League.name);

            jsonObject.accumulate("week", Week.current());

            jsonObject.accumulate("homeTeam", homeTeam.name);
            jsonObject.accumulate("awayTeam", awayTeam.name);

            jsonObject.accumulate("homeRoster", new JSONArray(homeTeam.getRoster()));
            jsonObject.accumulate("awayRoster", new JSONArray(awayTeam.getRoster()));

            jsonObject.accumulate("homeScore", homeScore.toString());
            jsonObject.accumulate("awayScore", awayScore.toString());

            // Points
            Gson gson = new Gson();
            JSONObject points = new JSONObject(gson.toJson(activeGame));
            jsonObject.accumulate("points", points.get("points"));

        } catch (Exception e) {
            e.printStackTrace();
        }

        return jsonObject;
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
        protected List<String> savedHomePlayers;
        protected List<String> savedAwayPlayers;

        public Memento(String savedFirstActor) {
            this.savedFirstActor = savedFirstActor;
        }

        public Memento(String savedFirstActor, List<String> savedHomePlayers, List<String> savedAwayPlayers) {
            this.savedFirstActor = savedFirstActor;
            this.savedHomePlayers = savedHomePlayers;
            this.savedAwayPlayers = savedAwayPlayers;
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
