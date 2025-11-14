from fastapi.testclient import TestClient
from multiprocessing import Process
from sqlmodel import Session, SQLModel, create_engine
from typing import Generator
import json
import logging
import pathlib
import pytest
import random
import time
import uvicorn

from server.api import CURRENT_LEAGUE_ID
from server.app import app
import server.db as db

logging.basicConfig()
logger = logging.getLogger("sqlalchemy.engine")
logger.setLevel(logging.WARN)


@pytest.fixture(name="session", scope="function")
def session_fixture():
    """Database session with test db injected."""
    engine = create_engine("sqlite:///test.sqlite")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="server", scope="function")
def server_process(session: Session) -> Generator[Process, None, None]:
    """Starts a uvicorn server in a separate process."""

    def get_session_override():
        return session

    app.dependency_overrides[db.get_session] = get_session_override

    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8000)

    process = Process(target=run_server)
    process.start()
    time.sleep(1)
    yield process
    process.terminate()
    process.join()


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session):
    """Test client for making api requests in tests."""

    def get_session_override():
        return session

    app.dependency_overrides[db.get_session] = get_session_override

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="league", scope="function")
def league_fixture(session):
    league = db.League()
    league.id = CURRENT_LEAGUE_ID
    league.zuluru_id = 1
    league.name = "Test"
    session.add(league)
    session.commit()
    return league


# valid for mini_games
# players get created during stat upload but don't get teams
# players only get teams when created through a zuluru sync
# otherwise subsitutes etc would change rosters
@pytest.fixture(name="rosters", scope="function")
def rosters_fixture(session, league) -> dict[str, list[str]]:
    fixture_path = pathlib.Path(__file__).parent / "./data/rosters.json"

    with open(fixture_path) as f:
        rosters_str = f.read()

    rosters: dict[str, list[str]] = json.loads(rosters_str)

    for idx, team in enumerate(rosters):
        t = db.Team(league_id=league.id, zuluru_id=idx, name=team)
        session.add(t)
        session.commit()
        players = rosters[team]

        # Create gender list and shuffle
        # This sort of ensures we exercise both styles in the tests without having to fix the data
        # Sorry if you get misgendered!
        num_open = 8
        num_women = 4
        genders = ["male"] * num_open + ["female"] * num_women
        random.shuffle(genders)

        for i, p in enumerate(players):
            session.add(db.Player(league_id=league.id, name=p, team_id=t.id, gender=genders[i]))
        session.commit()

    return rosters


@pytest.fixture(name="matchup", scope="function")
def matchup_fixture(session, league, rosters):
    """Creates a test matchup for upcoming games."""
    from datetime import datetime, timedelta
    from sqlmodel import select

    # Use teams that have distinct rosters (used in other tests)
    home_team = session.exec(select(db.Team).where(db.Team.name == "Kells Angels Bicycle Club")).first()
    away_team = session.exec(select(db.Team).where(db.Team.name == "lumleysexuals")).first()

    matchup = db.Matchup(
        league_id=league.id,
        home_team_id=home_team.id,
        away_team_id=away_team.id,
        week=7,
        game_start=datetime.now() + timedelta(days=1, hours=19),
        game_end=datetime.now() + timedelta(days=1, hours=20),
    )
    session.add(matchup)
    session.commit()

    return matchup
