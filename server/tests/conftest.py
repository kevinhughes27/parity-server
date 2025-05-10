import pytest
import os
import pathlib
import json
from app import app
from models import db, League, Team, Player


@pytest.fixture(scope="session")
def app_context():
    os.environ["PARITY_EDIT_PASSWORD"] = "testpw"
    app.config["TESTING"] = True
    with app.app_context():
        yield app


@pytest.fixture(scope="session")
def client(app_context):
    with app_context.test_client() as client:
        yield client


@pytest.fixture(scope="function", name="db")
def setup_database(app_context):
    db.drop_all()
    db.create_all()

    yield db

    db.session.remove()


@pytest.fixture(scope="function")
def league(db):
    league = League()
    league.id = 1
    league.zuluru_id = 1
    league.name = "Test"
    league.stat_values = "v2"
    league.salary_calc = "sum"
    db.session.add(league)
    db.session.commit()
    return league


# valid for mini_games
# players get created during stat upload but don't get teams
# players only get teams when created through a zuluru sync
# otherwise subsitutes etc would change rosters
@pytest.fixture(scope="function")
def rosters(db, league):
    fixture_path = pathlib.Path(__file__).parent / "./data/rosters.json"

    with open(fixture_path) as f:
        rosters_str = f.read()

    rosters = json.loads(rosters_str)

    for idx, team in enumerate(rosters):
        t = Team(league_id=league.id, zuluru_id=idx, name=team)
        db.session.add(t)
        db.session.commit()
        players = rosters[team]
        for p in players:
            db.session.add(Player(league_id=league.id, name=p, team_id=t.id))
        db.session.commit()
