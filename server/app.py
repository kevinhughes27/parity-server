from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from typing import Annotated, Any
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlmodel import Session, create_engine, select
from starlette.responses import FileResponse
from stats_calculator import StatsCalculator
from pathlib import Path

import api
import config
import db
import os
import uvicorn


# Constants
react_app_path = Path(__file__).parents[1] / "web/build"
if not react_app_path.exists():
    print(f"Warning: React app directory not found at {react_app_path}")


# Settings
settings = config.Config()


# Cache Setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
    yield
    await FastAPICache.close()


# Init
app = FastAPI(lifespan=lifespan)

# Database Setup
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)


# Database Session
def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


# Admin
security = HTTPBasic()


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
class League(api.BaseSchema):
    id: int
    name: str
    line_size: int


class CurrentLeague(api.BaseSchema):
    league: League


@app.get("/current_league", include_in_schema=False)
@cache()
async def current_league(session: SessionDep) -> CurrentLeague:
    """Return the current league.

    Used by the Android app which requires the nesting
    """
    league = session.get(db.League, config.CURRENT_LEAGUE_ID)
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


@app.post("/submit_game", status_code=201)
async def upload(session: SessionDep, uploaded_game: UploadedGame):
    game = db.Game(**uploaded_game.model_dump())

    # save the game to the database
    session.add(game)
    session.commit()

    # calculate and save stats
    StatsCalculator(game).run(session)

    # clear the stats cache
    await FastAPICache.clear()

    return


# API
@app.get("/api/leagues")
@cache()
async def leagues(session: SessionDep) -> list[api.League]:
    return api.build_leagues_response(session)


@app.get("/api/{league_id}/teams", response_model=list[api.Team])
@cache()
async def teams(league_id: int, session: SessionDep) -> list[api.Team]:
    return api.build_teams_response(session, league_id)


@app.get("/api/{league_id}/schedule")
@cache()
async def schedule(league_id: int, session: SessionDep) -> list[api.Schedule]:
    return api.build_schedule_response(session, league_id)


@app.get("/api/{league_id}/players", response_model=list[api.Player])
@cache()
async def players(league_id: int, session: SessionDep) -> list[api.Player]:
    return api.build_players_response(session, league_id)


@app.get("/api/{league_id}/games")
async def games(league_id: int, session: SessionDep) -> list[api.Game]:
    # include_points = request.args.get('includePoints') == 'true'
    return api.build_games_response(session, league_id)


@app.get("/api/{league_id}/games/{id}")
@cache()
async def game(league_id: int, id: int, session: SessionDep) -> api.GameWithStats:
    return api.build_game_response(session, league_id, id)


class EditedGame(api.BaseSchema):
    home_score: int
    away_score: int
    home_roster: list[str]
    away_roster: list[str]
    points: list[dict[str, Any]]


@app.post("/api/{league_id}/games/{id}")
async def edit_game(
    admin: AdminDep,
    session: SessionDep,
    league_id: int,
    id: int,
    edited_game: EditedGame,
):
    statement = select(db.Game).where(db.Game.league_id == league_id, db.Game.id == id)
    game = session.exec(statement).first()

    # updating Game
    game.home_score = edited_game.home_score
    game.away_score = edited_game.away_score
    game.home_roster = edited_game.home_roster
    game.away_roster = edited_game.away_roster
    game.points = edited_game.points

    session.add(game)
    session.commit()

    # loading other games from the same week
    statement = select(db.Game).where(
        db.Game.league_id == league_id, db.Game.week == game.week
    )
    games = session.exec(statement).all()
    game_ids = [game.id for game in games]

    # deleting old stats
    statement = select(db.Stats).where(db.Stats.game_id.in_(game_ids))
    stats = session.exec(statement).all()

    for stat in stats:
        session.delete(stat)
    session.commit()

    # re-calculating stats
    for game in games:
        StatsCalculator(game).run(session)

    # clear the stats cache
    await FastAPICache.clear()

    return


@app.delete("/api/{league_id}/games/{id}")
async def delete_game(admin: AdminDep, session: SessionDep, league_id: int, id: int):
    statement = select(db.Game).where(db.Game.league_id == league_id, db.Game.id == id)
    game = session.exec(statement).first()

    session.delete(game)
    for stat in game.stats:
        session.delete(stat)
    session.commit()

    # clear the stats cache
    await FastAPICache.clear()

    return


@app.get("/api/{league_id}/weeks", response_model=list[int])
@cache()
async def weeks(league_id: int, session: SessionDep) -> list[int]:
    statement = select(db.Game.week).where(db.Game.league_id == league_id)
    weeks = set(session.exec(statement).all())
    return sorted(weeks)


@app.get("/api/{league_id}/weeks/{week}", response_model=api.WeekStats)
@cache()
async def week(league_id: int, week: int, session: SessionDep) -> api.WeekStats:
    return api.build_stats_response(session, league_id, week)


@app.get("/api/{league_id}/stats", response_model=api.WeekStats)
@cache()
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


# Start Server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
