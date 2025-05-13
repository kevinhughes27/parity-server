from fastapi import APIRouter, FastAPI, Depends
from typing import Annotated
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from sqlmodel import Session, create_engine, select
from starlette.responses import FileResponse
from pydantic import BaseModel
from typing import Any

from config import CURRENT_LEAGUE_ID, Config
from models import League, Team, Player, Game, Matchup
# from lib import build_stats_response, build_teams_response, build_players_response
from lib import build_stats_response, build_players_response

# from lib import StatsCalculator
# from functools import wraps
from pathlib import Path
import uvicorn


# import os
# import datetime


# Constants
react_app_path = Path(__file__).parents[1] / "web/build"
league_utc_offset = -5


# Settings
settings = Config()

# Init
# maybe switch to APIRouter https://fastapi.tiangolo.com/tutorial/bigger-applications/#import-apirouter
# it redirects the trailing slashes
app = FastAPI()
router = APIRouter()

# Database Setup
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


# Caching Setup
@app.on_event("startup")
async def startup():
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")


# Current League
@app.get("/current_league", response_model=League)
@cache()
async def current_league(session: SessionDep):
    league = session.get(League, CURRENT_LEAGUE_ID)
    # need to add line_size to league
    return league


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


class TeamPlayerResponse(BaseModel):
    name: str
    team: str
    is_male: bool


class TeamResponse(BaseModel):
    id: int
    name: str
    players: list[TeamPlayerResponse]


# API
@router.get("/api/{league_id}/teams", response_model=list[Team])
@cache()
async def teams(league_id: int, session: SessionDep):
    statement = select(Team).where(Team.league_id == league_id)
    teams = session.exec(statement).all()
    teams_response = []
    for team in teams:
        players = []
        for player in team.players:
            players.append(TeamPlayerResponse(
                id=player.id,
                name=player.name,
                is_male=player.is_male
            ))
        teams_response.append(TeamResponse(
            id=team.id,
            name=team.name,
            players=players
        ))
    return teams_response


@router.get("/api/{league_id}/schedule", response_model=list[Matchup])
@cache()
async def schedule(league_id: int, session: SessionDep):
    # teams = build_teams_response(league_id)
    #
    # matchup_count = len(teams) / 2
    # local_today = datetime.datetime.now() + datetime.timedelta(hours=league_utc_offset)
    # today = local_today.date()
    #
    # query = Matchup.query.filter(Matchup.league_id == league_id, Matchup.game_start >= today).limit(matchup_count)
    #
    # matchups = [matchup.to_dict() for matchup in query]
    #
    # return jsonify({"teams": teams, "matchups": matchups})
    statement = select(Matchup).where(Matchup.league_id == league_id)
    matchups = session.exec(statement).all()
    return matchups


class PlayerResponse(BaseModel):
    name: str
    team: str
    salary: int


@router.get("/api/{league_id}/players")
@cache()
async def players(league_id: int, session: SessionDep) -> list[PlayerResponse]:
    players = build_players_response(session, league_id)
    return [PlayerResponse(**p) for p in players]


@router.get("/api/{league_id}/games")
async def games(league_id: int, session: SessionDep):
    # include_points = request.args.get('includePoints') == 'true'
    statement = select(Game).where(Game.league_id == league_id)
    games = session.exec(statement).all()
    return games


@router.get("/api/{league_id}/games/{id}", response_model=Game)
@cache()
async def game(league_id: int, id: int, session: SessionDep):
    statement = select(Game).where(Player.league_id == league_id, Game.id == id)
    game = session.exec(statement).first()
    stats = build_stats_response(session, league_id, [game])
    game.set_game_stats(stats)
    return game


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
# @router.route('/api/<league_id>/games/<id>', methods=['POST'])
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
# @router.route('/api/<league_id>/games/<id>', methods=['DELETE'])
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


@router.get('/api/leagues', response_model=list[League])
@cache()
async def leagues(session: SessionDep):
    statement = select(League)
    leagues = session.exec(statement).all()
    return leagues


@router.get('/api/{league_id}/weeks')
@cache()
async def weeks(league_id: int, session: SessionDep) -> list[int]:
    statement = select(Game.week).where(Game.league_id == league_id)
    weeks = set(session.exec(statement).all())
    return sorted(weeks)


class StatsResponse(BaseModel):
    week: int
    stats: dict[str, Any]


@router.get('/api/{league_id}/weeks/{num}')
@cache()
async def week(league_id: int, num: int, session: SessionDep) -> StatsResponse:
    statement = select(Game).where(Game.league_id == league_id, Game.week == num)
    games = session.exec(statement).all()
    stats = build_stats_response(session, league_id, games)
    return StatsResponse(week=num, stats=stats)


@router.get('/api/{league_id}/stats')
@cache()
async def stats(league_id: int, session: SessionDep) -> StatsResponse:
    statement = select(Game).where(Game.league_id == league_id).order_by(Game.week.asc())
    games = session.exec(statement).all()
    stats = build_stats_response(session, league_id, games)
    return StatsResponse(week=0, stats=stats)

# Add API Routes
app.include_router(router)

# React App
if not react_app_path.exists():
    print(f"Warning: React app directory not found at {react_app_path}")


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    file_path = react_app_path / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    else:
        return FileResponse(react_app_path / 'index.html')


# Boot server for Development / Test
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
