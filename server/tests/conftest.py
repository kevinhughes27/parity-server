from app import app, get_session
from fastapi.testclient import TestClient
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
import db
import json
import pytest
import pathlib


@pytest.fixture()
def fastapi_cache():
    FastAPICache.init(InMemoryBackend())


@pytest.fixture(name="session", scope="function")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session, fastapi_cache):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="league", scope="function")
def league_fixture(session):
    league = db.League()
    league.id = 1
    league.zuluru_id = 1
    league.name = "Test"
    league.stat_values = "v2"
    league.salary_calc = "sum"
    session.add(league)
    session.commit()
    return league


# valid for mini_games
# players get created during stat upload but don't get teams
# players only get teams when created through a zuluru sync
# otherwise subsitutes etc would change rosters
@pytest.fixture(name="rosters", scope="function")
def rosters_fixture(session, league):
    fixture_path = pathlib.Path(__file__).parent / "./data/rosters.json"

    with open(fixture_path) as f:
        rosters_str = f.read()

    rosters = json.loads(rosters_str)

    for idx, team in enumerate(rosters):
        t = db.Team(league_id=league.id, zuluru_id=idx, name=team)
        session.add(t)
        session.commit()
        players = rosters[team]
        for p in players:
            session.add(db.Player(league_id=league.id, name=p, team_id=t.id))
        session.commit()
