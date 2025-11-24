from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlmodel import Session, col, select
import os

from server.stats_calculator import StatsCalculator
import server.api as api
import server.db as db

security = HTTPBasic()


def verify(credentials: HTTPBasicCredentials = Depends(security)):
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


class EditedGame(api.BaseSchema):
    home_score: int
    away_score: int
    home_roster: list[str]
    away_roster: list[str]
    points: list[api.Point]
    week: int


def edit_game(
    session: Session,
    league_id: int,
    game_id: int,
    edited_game: EditedGame,
):
    game = session.exec(select(db.Game).where(db.Game.league_id == league_id, db.Game.id == game_id)).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # updating Game
    game.home_score = edited_game.home_score
    game.away_score = edited_game.away_score
    game.home_roster = edited_game.home_roster
    game.away_roster = edited_game.away_roster
    game.points = [point.model_dump() for point in edited_game.points]
    game.week = edited_game.week

    session.add(game)
    session.commit()

    # loading other games from the same week
    games = session.exec(select(db.Game).where(db.Game.league_id == league_id, db.Game.week == game.week)).all()
    game_ids = [game.id for game in games]

    # deleting old stats
    stats = session.exec(select(db.Stats).where(col(db.Stats.game_id).in_(game_ids))).all()

    for stat in stats:
        session.delete(stat)
    session.commit()

    # re-calculating stats
    for game in games:
        StatsCalculator(game).run(session)

    # clear the stats cache

    return


def delete_game(session: Session, league_id: int, game_id: int):
    game = session.exec(select(db.Game).where(db.Game.league_id == league_id, db.Game.id == game_id)).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    for stat in game.stats:
        session.delete(stat)

    session.delete(game)
    session.commit()

    # clear the stats cache

    return
