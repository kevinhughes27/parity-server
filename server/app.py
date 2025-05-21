from fastapi import FastAPI, Depends
from typing import Annotated
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from sqlmodel import Session, create_engine, select
from starlette.responses import FileResponse
from pathlib import Path

import api
import config
import db

# from lib import StatsCalculator
# from functools import wraps
import uvicorn


# Constants
react_app_path = Path(__file__).parents[1] / "web/build"
if not react_app_path.exists():
    print(f"Warning: React app directory not found at {react_app_path}")


# Settings
settings = config.Config()

# Init
app = FastAPI()

# Database Setup
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)


# Database session
def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


# Caching Setup
@app.on_event("startup")
async def startup():
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")


# Current League
@app.get("/current_league", include_in_schema=False)
@cache()
async def current_league(session: SessionDep) -> db.League:
    return api.current_league(session)


# # Submit Game
# @app.route('/submit_game', methods=['POST'])
# def upload():
#     # save the game to the database
#     game = save_game(request.json)
#
#     # calculate and save stats
#     StatsCalculator(game).run()
#
#     # clear the stats cache
#     cache.clear()
#
#     return ('', 201)
#
#
# def save_game(upload_json):
#     game = Game()
#
#     game.league_id = upload_json['league_id']
#     game.week = upload_json['week']
#
#     game.home_team = upload_json['homeTeam']
#     game.away_team = upload_json['awayTeam']
#
#     game.home_score = upload_json['homeScore']
#     game.away_score = upload_json['awayScore']
#
#     game.home_roster = upload_json['homeRoster']
#     game.away_roster = upload_json['awayRoster']
#
#     game.points = upload_json['points']
#
#     db.session.add(game)
#     db.session.commit()
#
#     return game


# API
@app.get('/api/leagues')
@cache()
async def leagues(session: SessionDep) -> list[db.League]:
    statement = select(db.League)
    leagues = session.exec(statement).all()
    return leagues


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


# def admin_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if os.environ.get('PARITY_EDIT_PASSWORD') is None:
#             return ('PARITY_EDIT_PASSWORD env var not set', 401)
#
#         if os.environ.get('PARITY_EDIT_PASSWORD') != request.headers['Authorization']:
#             return ('Password does not match PARITY_EDIT_PASSWORD', 401)
#
#         return f(*args, **kwargs)
#     return decorated_function
#
#
# @app.route('/api/<league_id>/games/<id>', methods=['POST'])
# @admin_required
# def edit_game(league_id, id):
#     game = Game.query.filter_by(league_id=league_id, id=id).first()
#
#     # updating Game
#     game.home_score = request.json['homeScore']
#     game.away_score = request.json['awayScore']
#     game.home_roster = request.json['homeRoster']
#     game.away_roster = request.json['awayRoster']
#     game.points = request.json['points']
#
#     db.session.add(game)
#     db.session.commit()
#
#     # loading other games from the same week
#     games = Game.query.filter_by(league_id=league_id, week=game.week).all()
#     game_ids = [game.id for game in games]
#
#     # deleting old stats
#     stats = Stats.query.filter(Stats.game_id.in_(game_ids)).all()
#     for stat in stats:
#         db.session.delete(stat)
#     db.session.commit()
#
#     # re-calculating stats
#     for game in games:
#         StatsCalculator(game).run()
#
#     # clear the stats cache
#     cache.clear()
#
#     return ('', 200)
#
#
# @app.route('/api/<league_id>/games/<id>', methods=['DELETE'])
# @admin_required
# def delete_game(league_id, id):
#     game = Game.query.filter_by(league_id=league_id, id=id).first()
#     stats = Stats.query.filter_by(game_id=id).all()
#
#     db.session.delete(game)
#
#     for stat in stats:
#         db.session.delete(stat)
#
#     db.session.commit()
#
#     # clear the stats cache
#     cache.clear()
#
#     return ('', 200)


@app.get('/api/{league_id}/weeks', response_model=list[int])
@cache()
async def weeks(league_id: int, session: SessionDep) -> list[int]:
    statement = select(db.Game.week).where(db.Game.league_id == league_id)
    weeks = set(session.exec(statement).all())
    return sorted(weeks)


@app.get('/api/{league_id}/weeks/{week}', response_model=api.WeekStats)
@cache()
async def week(league_id: int, week: int, session: SessionDep) -> api.WeekStats:
    return api.build_stats_response(session, league_id, week)


@app.get('/api/{league_id}/stats', response_model=api.WeekStats)
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
        return FileResponse(react_app_path / 'index.html')


# Boot server for Development / Test
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
