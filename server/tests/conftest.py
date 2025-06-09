from fastapi.testclient import TestClient
from multiprocessing import Process
from sqlmodel import Session, SQLModel, create_engine
import json
import logging
import pathlib
import pytest
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
def server_process(session: Session) -> Process:
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
def rosters_fixture(session, league) -> dict[str: list[str]]:
    fixture_path = pathlib.Path(__file__).parent / "./data/rosters.json"

    with open(fixture_path) as f:
        rosters_str = f.read()

    rosters: dict[str: list[str]] = json.loads(rosters_str)

    for idx, team in enumerate(rosters):
        t = db.Team(league_id=league.id, zuluru_id=idx, name=team)
        session.add(t)
        session.commit()
        players = rosters[team]
        for p in players:
            session.add(db.Player(league_id=league.id, name=p, team_id=t.id))
        session.commit()

    return rosters
