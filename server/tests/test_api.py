from .helpers import QueryCounter, upload_game
from datetime import datetime, time, timedelta

from server.api import CURRENT_LEAGUE_ID
import server.db as db


def test_leagues(client, league, snapshot):
    response = client.get("/api/leagues")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Test", "lineSize": 6, "zuluru_id": 1}]


def test_current_league(client, session):
    league = db.League()
    league.id = CURRENT_LEAGUE_ID
    league.zuluru_id = 1
    league.name = "Current"
    league.stat_values = "v2"
    league.salary_calc = "sum"
    session.add(league)
    session.commit()

    response = client.get("/current_league")
    assert response.status_code == 200
    assert response.json() == {
        "league": {
            "id": CURRENT_LEAGUE_ID,
            "name": "Current",
            "lineSize": 6,
            "zuluru_id": 1,
        }
    }


def test_schedule(client, session, league, rosters):
    future_date = datetime.today().date() + timedelta(days=2)

    matchup = db.Matchup(
        league_id=league.id,
        home_team_id=league.teams[0].id,
        away_team_id=league.teams[1].id,
        week=1,
        game_start=datetime.combine(future_date, time(18, 45)),
        game_end=datetime.combine(future_date, time(20, 35)),
    )
    session.add(matchup)
    session.commit()

    response = client.get("/api/1/schedule")
    assert response.status_code == 200
    resp_json = response.json()

    assert "teams" in resp_json
    assert len(resp_json["teams"]) == 4

    assert "matchups" in resp_json
    assert len(resp_json["matchups"]) == 1


def test_api_endpoints(client, league, rosters):
    upload_game(client, "mini_game.json")
    upload_game(client, "mini_game2.json")

    # teams
    response = client.get("/api/1/teams")
    assert response.status_code == 200
    assert len(response.json()) == 4

    # players
    response = client.get("/api/1/players")
    assert response.status_code == 200
    assert len(response.json()) == 48

    # games
    response = client.get("/api/1/games")
    assert response.status_code == 200
    assert len(response.json()) == 2

    response = client.get("/api/1/games?includePoints=true")
    assert response.status_code == 200
    assert len(response.json()) == 2

    # game
    response = client.get("/api/1/games/1")
    assert response.status_code == 200
    assert len(response.json()["points"]) == 4

    # weeks
    response = client.get("/api/1/weeks")
    assert response.status_code == 200
    assert response.json() == [1]

    # week stats
    response = client.get("/api/1/weeks/1")
    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json["week"] == 1
    assert "stats" in resp_json
    assert len(resp_json["stats"]) == 48

    # all stats
    response = client.get("/api/1/stats")
    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json["week"] == 0
    assert "stats" in resp_json
    assert len(resp_json["stats"]) == 48


def test_query_count(client, session, league, rosters):
    """Test Database Query counts.

    Whenever an ORM is involved I find tests of this format to
    be useful. it helps ensure we don't have N+1 queries

    Note that upload has a lot of queries because it creates
    players on demand.
    """
    with QueryCounter(session.connection()) as counter:
        upload_game(client, "mini_game.json")
        assert counter.count == 113

    with QueryCounter(session.connection()) as counter:
        upload_game(client, "mini_game2.json")
        assert counter.count == 68

    # leagues
    with QueryCounter(session.connection()) as counter:
        client.get("/api/leagues")
        assert counter.count == 1

    # teams
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/teams")
        assert counter.count == 5

    # players
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/players")
        assert counter.count == 6

    # games
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/games")
        assert counter.count == 1

    # game
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/games/1")
        assert counter.count == 4

    # weeks
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/weeks")
        assert counter.count == 1

    # week stats
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/weeks/1")
        assert counter.count == 4

    # all stats
    with QueryCounter(session.connection()) as counter:
        client.get("/api/1/stats")
        assert counter.count == 4
