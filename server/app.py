from fastapi import Depends, FastAPI
from pathlib import Path
from sqlmodel import Session
from starlette.responses import FileResponse
from typing import Annotated
import logging

import server.admin as admin
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
    ],
)

# Assets
react_app_path = Path(__file__).parents[1] / "web/build"
if not react_app_path.exists():
    print(f"Warning: React app directory not found at {react_app_path}")

# Logging
logging.basicConfig()
logger = logging.getLogger("sqlalchemy.engine")
logger.setLevel(logging.WARN)  # INFO to see queries

# Dependencies
SessionDep = Annotated[Session, Depends(db.get_session)]
AdminDep = Annotated[Session, Depends(admin.verify)]


# Current League
@app.get("/current_league", tags=["android"])
async def current_league(session: SessionDep) -> api.CurrentLeague:
    return api.current_league(session)


# Submit Game
@app.post("/submit_game", status_code=201, tags=["android"])
async def upload(session: SessionDep, uploaded_game: api.UploadedGame):
    """Upload a game recorded on the Android app."""
    api.upload_game(session, uploaded_game)
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
async def games(
    session: SessionDep, league_id: int, includePoints: bool = False
) -> list[api.Game]:
    return api.build_games_response(session, league_id, includePoints)


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
