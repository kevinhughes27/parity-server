from fastapi import Depends, FastAPI
from pathlib import Path
from sqlmodel import Session, create_engine
from starlette.responses import FileResponse
from typing import Annotated
import logging
import os

from server.stats_calculator import StatsCalculator
import server.admin as admin
import server.api as api
import server.db as db

CURRENT_LEAGUE_ID = 22

# Init
app = FastAPI(
    title="OCUA Parity League",
    summary="API Documentation",
    openapi_tags=[
        {"name": "api"},
        {"name": "android"},
        {"name": "admin"},
    ],
)


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


# Dependencies
SessionDep = Annotated[Session, Depends(get_session)]
AdminDep = Annotated[Session, Depends(admin.verify)]


# Current League
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
    points: list[api.Point]

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

    return "OK"


# API
@app.get("/api/leagues", tags=["api"])
async def leagues(session: SessionDep) -> list[api.League]:
    return api.build_leagues_response(session)


@app.get("/api/{league_id}/teams", tags=["api"])
async def teams(session: SessionDep, league_id: int) -> list[api.Team]:
    return api.build_teams_response(session, league_id)


@app.get("/api/{league_id}/schedule", tags=["android"])
async def schedule(session: SessionDep, league_id: int) -> api.Schedule:
    return api.build_schedule_response(session, league_id)


@app.get("/api/{league_id}/players", tags=["api"])
async def players(session: SessionDep, league_id: int) -> list[api.Player]:
    return api.build_players_response(session, league_id)


@app.get("/api/{league_id}/games", tags=["api"])
async def games(session: SessionDep, league_id: int) -> list[api.Game]:
    # include_points = request.args.get('includePoints') == 'true'
    return api.build_games_response(session, league_id)


@app.get("/api/{league_id}/games/{id}", tags=["api"])
async def game(session: SessionDep, league_id: int, id: int) -> api.GameWithStats:
    return api.build_game_response(session, league_id, id)


@app.post("/api/{league_id}/games/{id}", tags=["admin"])
async def update_game(
    login: AdminDep,
    session: SessionDep,
    league_id: int,
    id: int,
    edited_game: admin.EditedGame,
):
    admin.edit_game(session, league_id, id, edited_game)
    return "OK"


@app.delete("/api/{league_id}/games/{id}", tags=["admin"])
async def delete_game(login: AdminDep, session: SessionDep, league_id: int, id: int):
    admin.delete_game(session, league_id, id)
    return "OK"


@app.get("/api/{league_id}/weeks", tags=["api"])
async def weeks(session: SessionDep, league_id: int) -> list[int]:
    return api.build_weeks_response(session, league_id)


@app.get("/api/{league_id}/weeks/{week}", tags=["api"])
async def week(session: SessionDep, league_id: int, week: int) -> api.WeekStats:
    return api.build_stats_response(session, league_id, week)


@app.get("/api/{league_id}/stats", tags=["api"])
async def stats(session: SessionDep, league_id: int) -> api.WeekStats:
    return api.build_stats_response(session, league_id, 0)


# React App
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_react_app(full_path: str):
    file_path = react_app_path / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    else:
        return FileResponse(react_app_path / "index.html")
