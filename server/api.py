from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy.orm import InstrumentedAttribute, selectinload
from sqlmodel import Session, col, select
from typing import Collection, Optional, cast
import datetime

from server.stats_calculator import StatsCalculator
import server.db as db

CURRENT_LEAGUE_ID = 23


def alias_generator(key: str) -> str:
    """Convert some fields to camelCase.

    For various reasons and history this app is inconsistent.
    The logic is now centralized here.
    """

    if "home_" in key or "away_" in key:
        return to_camel(key)
    if key == "line_size":
        return to_camel(key)
    if "game_" in key:
        return to_camel(key)

    return key


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=alias_generator,
        populate_by_name=True,
        from_attributes=True,
    )


class League(BaseSchema):
    id: int
    zuluru_id: int | None  # Parity Tournament 2020
    name: str
    line_size: int


class CurrentLeague(BaseSchema):
    league: League


class Player(BaseSchema):
    name: str
    team: str
    salary: int


class TeamPlayer(BaseSchema):
    name: str
    team: str
    is_male: bool


class Team(BaseSchema):
    id: int
    name: str
    players: list[TeamPlayer]


class Event(BaseModel):
    timestamp: str
    type: str
    firstActor: str
    secondActor: Optional[str] = None


class Point(BaseModel):
    defensePlayers: list[str]
    offensePlayers: list[str]
    events: list[Event]


class UploadedGame(BaseSchema):
    league_id: int
    week: int
    home_team: str
    away_team: str

    home_roster: list[str]
    away_roster: list[str]
    points: list[Point]

    home_score: int
    away_score: int


class Game(BaseSchema):
    id: int
    league_id: int
    week: int
    home_team: str
    away_team: str

    home_roster: list[str]
    away_roster: list[str]
    points: Optional[list[Point]] = None

    home_score: int
    away_score: int


class Stats(BaseSchema):
    goals: int
    assists: int
    second_assists: int
    d_blocks: int
    completions: int
    throw_aways: int
    threw_drops: int
    catches: int
    drops: int
    pulls: int
    callahan: int
    o_points_for: int
    o_points_against: int
    d_points_for: int
    d_points_against: int
    points_played: int

    team: str

    pay: int
    salary_per_point: int
    o_efficiency: float
    d_efficiency: float
    total_efficiency: float


class GameWithStats(Game):
    stats: dict[str, Stats]


class WeekStats(BaseSchema):
    week: int
    stats: dict[str, Stats]


class Matchup(BaseSchema):
    id: int
    league_id: int
    home_team_id: int
    away_team_id: int
    week: int
    game_start: datetime.datetime
    game_end: datetime.datetime


class Schedule(BaseSchema):
    teams: list[Team]
    matchups: list[Matchup]


def current_league(session: Session) -> CurrentLeague:
    """Return the current league.

    Used by the Android app which requires the nesting
    """
    league = session.get(db.League, CURRENT_LEAGUE_ID)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return CurrentLeague(league=League(**league.model_dump()))


def upload_game(session: Session, uploaded_game: UploadedGame):
    game = db.Game(**uploaded_game.model_dump())

    # save the game to the database
    session.add(game)
    session.commit()

    # calculate and save stats
    StatsCalculator(game).run(session)

    # clear the stats cache


def build_leagues_response(session: Session) -> list[League]:
    leagues = session.exec(select(db.League)).all()
    return [League(**league.model_dump()) for league in leagues]


def build_weeks_response(session: Session, league_id: int) -> list[int]:
    weeks = set(session.exec(select(db.Game.week).where(db.Game.league_id == league_id)).all())
    return sorted(weeks)


def build_games_response(session: Session, league_id: int, include_points: bool) -> list[Game]:
    games = session.exec(select(db.Game).where(db.Game.league_id == league_id)).all()
    if include_points:
        return [Game(**g.model_dump()) for g in games]
    else:
        return [Game(**g.model_dump(exclude={"points"})) for g in games]


def build_game_response(session: Session, league_id: int, game_id: int) -> GameWithStats:
    game = session.exec(select(db.Game).where(db.Game.league_id == league_id, db.Game.id == game_id)).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    stats = build_stats(session, league_id, [game])
    return GameWithStats(**game.model_dump(), stats=stats)


def build_stats_response(session: Session, league_id: int, week: int) -> WeekStats:
    if week == 0:
        games = session.exec(
            select(db.Game)
            .where(db.Game.league_id == league_id)
            .order_by(col(db.Game.week).asc())
            .options(selectinload(cast(InstrumentedAttribute, db.Game.stats)))
        ).all()
    else:
        games = session.exec(
            select(db.Game).where(db.Game.league_id == league_id, db.Game.week == week).options(selectinload(cast(InstrumentedAttribute, db.Game.stats)))
        ).all()
    stats = build_stats(session, league_id, games)
    return WeekStats(week=week, stats=stats)


def build_stats(session: Session, league_id: int, games: Collection[db.Game]) -> dict[str, Stats]:
    players = session.exec(select(db.Player).where(db.Player.league_id == league_id)).all()
    teams = session.exec(select(db.Team).where(db.Team.league_id == league_id)).all()

    player_stats: dict = {}

    stats_to_average = [
        "pay",
        "salary_per_point",
        "o_efficiency",
        "d_efficiency",
        "total_efficiency",
    ]

    # rollup stats per game
    for game in games:
        for game_stats in game.stats:
            player = [p for p in players if p.id == game_stats.player_id][0]
            data = game_stats.model_dump()

            # aggregate all stats for the player
            if player.name in player_stats:
                existing_data = player_stats[player.name]
                summed_stats = {s: data.get(s, 0) + existing_data.get(s, 0) for s in data.keys()}
                player_stats[player.name].update(summed_stats)
                player_stats[player.name]["games_played"] += 1
            else:
                player_stats.update({player.name: data})
                player_stats[player.name]["games_played"] = 1

            # set the team for the player
            if player.name in game.home_roster:
                team = game.home_team
            elif player.name in game.away_roster:
                team = game.away_team
            elif player.team_id:
                team = [t for t in teams if t.id == player.team_id][0].name
            else:
                team = "Unknown"

            player_stats[player.name]["team"] = team

            if player.gender:
                player_stats[player.name].update({"gender": player.gender})

    # resolve averages
    for player_name in player_stats.keys():
        for stat in stats_to_average:
            value = player_stats[player_name][stat]
            games_played = player_stats[player_name]["games_played"]
            player_stats[player_name][stat] = value / games_played

        player_stats[player_name]["pay"] = round(player_stats[player_name]["pay"])
        player_stats[player_name]["salary_per_point"] = round(player_stats[player_name]["salary_per_point"])
        player_stats[player_name].pop("games_played")

    return {k: Stats(**v) for k, v in player_stats.items()}


# teams gets queried more times than strictly necessary here
def build_players_response(session, league_id) -> list[Player]:
    league = session.get(db.League, league_id)
    players = [p for p in league.players if p.team_id is not None]
    stats = league.stats

    # Calculate Salaries 👍
    for player in players:
        player_stats = [s for s in stats if s.player_id == player.id]

        if len(player_stats) == 0:
            continue

        if league.salary_calc == "pro_rate":
            salaries = [ps.salary_per_point for ps in player_stats if ps.points_played > 3]
            if len(salaries) == 0:
                continue
            average_salary_per_point = sum(salaries) / len(salaries)

            pro_rated_number_of_points = 15
            pro_rated_salary = average_salary_per_point * pro_rated_number_of_points

            player.salary = round(pro_rated_salary)

        elif league.salary_calc == "sum":
            base = 500000

            earnings = [ps.pay for ps in player_stats]
            total_earnings = sum(earnings)

            player.salary = base + total_earnings

    # Estimate Salaries 👎
    male_salaries = [p.salary for p in players if p.is_male and p.salary]
    female_salaries = [p.salary for p in players if not p.is_male and p.salary]

    avg_male_salary = round(sum(male_salaries) / (len(male_salaries) or 1))
    avg_female_salary = round(sum(female_salaries) / (len(female_salaries) or 1))

    for player in players:
        if player.salary is None:
            if player.fallback_salary:
                player.salary = player.fallback_salary
            elif player.is_male:
                player.salary = avg_male_salary
            else:
                player.salary = avg_female_salary

    return [Player(name=p.name, team=p.team_name, salary=p.salary) for p in players]


def build_teams_response(session: Session, league_id: int) -> list[Team]:
    teams = session.exec(select(db.Team).where(db.Team.league_id == league_id)).all()
    teams_response = []
    for team in teams:
        players = []
        for player in team.players:
            players.append(TeamPlayer(name=player.name, team=team.name, is_male=player.is_male))
        teams_response.append(Team(id=team.id, name=team.name, players=players))
    return teams_response


def build_schedule_response(session: Session, league_id: int) -> Schedule:
    teams = build_teams_response(session, league_id)

    matchup_count = len(teams) / 2
    league_utc_offset = -5
    local_today = datetime.datetime.now() + datetime.timedelta(hours=league_utc_offset)
    today = local_today.date()

    matchups = session.exec(select(db.Matchup).where(db.Matchup.league_id == league_id, db.Matchup.game_start >= today).limit(int(matchup_count))).all()

    return Schedule(teams=teams, matchups=[Matchup(**m.model_dump()) for m in matchups])
