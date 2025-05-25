from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pathlib import Path
from sqlmodel import Session, col, create_engine, select
from starlette.responses import FileResponse
from typing import Annotated, Any
import logging
import os

from server.stats_calculator import StatsCalculator
import server.api as api
import server.db as db

# Init
app = FastAPI(
    title="OCUA Parity League",
    summary="API Documentation",
    openapi_tags=[
        {"name": "api"},
        {"name": "android"},
        {"name": "admin"},
    ]
)
security = HTTPBasic()

# Assets
react_app_path = Path(__file__).parents[1] / "web/build"
if not react_app_path.exists():
    print(f"Warning: React app directory not found at {react_app_path}")


# Database Setup
db_path = Path(__file__).parent / "db.sqlite"
db_uri = "sqlite:////" + str(db_path.absolute())
if os.name == "nt":
    db_uri = "sqlite:///" + str(db_path.absolute())

logging.basicConfig()
logger = logging.getLogger("sqlalchemy.engine")
logger.setLevel(logging.INFO)

engine = create_engine(db_uri)


# Database Session
def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


# Admin
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    if os.environ.get("PARITY_EDIT_PASSWORD") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PARITY_EDIT_PASSWORD env var not set",
            headers={"WWW-Authenticate": "Basic"},
        )

    correct_username = credentials.username == "admin"
    correct_password = credentials.password == os.environ.get("PARITY_EDIT_PASSWORD")

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


AdminDep = Annotated[Session, Depends(verify_admin)]


# Current League
CURRENT_LEAGUE_ID = 22


class League(api.BaseSchema):
    id: int
    name: str
    line_size: int


class CurrentLeague(api.BaseSchema):
    league: League


@app.get("/current_league", tags=["android"])
async def current_league(session: SessionDep) -> CurrentLeague:
    """Return the current league.

    Used by the Android app which requires the nesting
    """
    league = session.get(db.League, CURRENT_LEAGUE_ID)
    assert league
    return CurrentLeague(league=League(id=league.id, name=league.name, line_size=6))


# Submit Game
class UploadedGame(api.BaseSchema):
    league_id: int
    week: int
    home_team: str
    away_team: str

    home_roster: list[str]
    away_roster: list[str]
    points: list[dict[str, Any]]

    home_score: int
    away_score: int


@app.post("/submit_game", status_code=201, tags=["android"])
async def upload(session: SessionDep, uploaded_game: UploadedGame):
    """Upload a game recorded on the Android app."""
    game = db.Game(**uploaded_game.model_dump())

    # save the game to the database
    session.add(game)
    session.commit()

    # calculate and save stats
    StatsCalculator(game).run(session)

    # clear the stats cache

    return


# API
@app.get("/api/leagues", tags=["api"])
async def leagues(session: SessionDep) -> list[api.League]:
    return api.build_leagues_response(session)


@app.get("/api/{league_id}/teams", tags=["api"])
async def teams(league_id: int, session: SessionDep) -> list[api.Team]:
    return api.build_teams_response(session, league_id)


@app.get("/api/{league_id}/schedule", tags=["android"])
async def schedule(league_id: int, session: SessionDep) -> api.Schedule:
    return api.build_schedule_response(session, league_id)


@app.get("/api/{league_id}/players", tags=["api"])
async def players(league_id: int, session: SessionDep) -> list[api.Player]:
    return api.build_players_response(session, league_id)


@app.get("/api/{league_id}/games", tags=["api"])
async def games(league_id: int, session: SessionDep) -> list[api.Game]:
    # include_points = request.args.get('includePoints') == 'true'
    return api.build_games_response(session, league_id)


@app.get("/api/{league_id}/games/{id}", tags=["api"])
async def game(league_id: int, id: int, session: SessionDep) -> api.GameWithStats:
    return api.build_game_response(session, league_id, id)


class EditedGame(api.BaseSchema):
    home_score: int
    away_score: int
    home_roster: list[str]
    away_roster: list[str]
    points: list[dict[str, Any]]


@app.post("/api/{league_id}/games/{id}", tags=["admin"])
async def edit_game(
    admin: AdminDep,
    session: SessionDep,
    league_id: int,
    id: int,
    edited_game: EditedGame,
):
    game = session.exec(
        select(db.Game).where(db.Game.league_id == league_id, db.Game.id == id)
    ).first()
    assert game

    # updating Game
    game.home_score = edited_game.home_score
    game.away_score = edited_game.away_score
    game.home_roster = edited_game.home_roster
    game.away_roster = edited_game.away_roster
    game.points = edited_game.points

    session.add(game)
    session.commit()

    # loading other games from the same week
    games = session.exec(
        select(db.Game).where(db.Game.league_id == league_id, db.Game.week == game.week)
    ).all()
    game_ids = [game.id for game in games]

    # deleting old stats
    stats = session.exec(
        select(db.Stats).where(col(db.Stats.game_id).in_(game_ids))
    ).all()

    for stat in stats:
        session.delete(stat)
    session.commit()

    # re-calculating stats
    for game in games:
        StatsCalculator(game).run(session)

    # clear the stats cache

    return


@app.delete("/api/{league_id}/games/{id}", tags=["admin"])
async def delete_game(admin: AdminDep, session: SessionDep, league_id: int, id: int):
    game = session.exec(
        select(db.Game).where(db.Game.league_id == league_id, db.Game.id == id)
    ).first()
    assert game

    session.delete(game)
    for stat in game.stats:
        session.delete(stat)
    session.commit()

    # clear the stats cache

    return


@app.get("/api/{league_id}/weeks", tags=["api"])
async def weeks(league_id: int, session: SessionDep) -> list[int]:
    weeks = set(
        session.exec(select(db.Game.week).where(db.Game.league_id == league_id)).all()
    )
    return sorted(weeks)


@app.get("/api/{league_id}/weeks/{week}", tags=["api"])
async def week(league_id: int, week: int, session: SessionDep) -> api.WeekStats:
    return api.build_stats_response(session, league_id, week)


@app.get("/api/{league_id}/stats", tags=["api"])
async def stats(league_id: int, session: SessionDep) -> api.WeekStats:
    return api.build_stats_response(session, league_id, 0)


# React App
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_react_app(full_path: str):
    file_path = react_app_path / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    else:
        return FileResponse(react_app_path / "index.html")
