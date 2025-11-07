from datetime import datetime
from pathlib import Path
from pydantic import computed_field
from sqlmodel import JSON, Column, Field, Relationship, Session, SQLModel, create_engine
from typing import Optional
import os


def get_session():
    db_path = Path(__file__).parent / "db.sqlite"
    db_uri = "sqlite:////" + str(db_path.absolute())

    if os.name == "nt":
        db_uri = "sqlite:///" + str(db_path.absolute())

    if "DATABASE_URL" in os.environ:
        db_uri = os.environ["DATABASE_URL"]

    engine = create_engine(db_uri)

    with Session(engine) as session:
        yield session


class League(SQLModel, table=True):
    """Represents a league in the database."""

    id: int = Field(default=None, primary_key=True)
    zuluru_id: int = Field(default=None, unique=True, index=True)
    name: str = Field(index=True)
    stat_values: str = Field(default="v2")
    salary_calc: str = Field(default="pro_rate")
    line_size: int = Field(default=6)

    teams: list["Team"] = Relationship(back_populates="league")
    players: list["Player"] = Relationship(back_populates="league")
    games: list["Game"] = Relationship(back_populates="league")
    stats: list["Stats"] = Relationship(back_populates="league")
    matchups: list["Matchup"] = Relationship(back_populates="league")


class Player(SQLModel, table=True):
    """Represents a player in the database."""

    id: int = Field(default=None, primary_key=True)
    name: str = Field()
    gender: Optional[str] = Field()
    fallback_salary: Optional[float] = Field()

    zuluru_id: Optional[int] = Field(default=None)
    league_id: int = Field(foreign_key="league.id", index=True)
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)

    league: "League" = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")
    stats: list["Stats"] = Relationship(back_populates="player")

    @property
    def is_open(self):
        return self.gender == "male"

    @property
    def is_male(self):
        """Legacy property for backward compatibility with Android app"""
        return self.is_open

    @property
    def team_name(self):
        if self.team_id:
            return self.team.name
        else:
            "Substitute"

    @property
    def salary(self):
        if hasattr(self, "_salary"):
            return self._salary

    @salary.setter
    def salary(self, salary):
        self._salary = salary


class Team(SQLModel, table=True):
    """Represents a team in the database."""

    id: int = Field(default=None, primary_key=True)
    zuluru_id: int = Field(default=None, unique=True, index=True)
    league_id: int = Field(foreign_key="league.id", index=True)
    name: str = Field(default=None)

    league: "League" = Relationship(back_populates="teams")
    players: list["Player"] = Relationship(back_populates="team")

    home_matchups: list["Matchup"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Matchup.home_team_id"},
        back_populates="home_team",
    )
    away_matchups: list["Matchup"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Matchup.away_team_id"},
        back_populates="away_team",
    )


class Matchup(SQLModel, table=True):
    """Represents a matchup in the database."""

    id: int = Field(default=None, primary_key=True)

    league_id: int = Field(foreign_key="league.id", index=True)
    home_team_id: int = Field(foreign_key="team.id", index=True)
    away_team_id: int = Field(foreign_key="team.id", index=True)

    week: int = Field(default=None)
    game_start: datetime = Field(default=None)
    game_end: datetime = Field(default=None)

    league: "League" = Relationship(back_populates="matchups")
    home_team: "Team" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Matchup.home_team_id"},
        back_populates="home_matchups",
    )
    away_team: "Team" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Matchup.away_team_id"},
        back_populates="away_matchups",
    )


class Game(SQLModel, table=True):
    """Represents a game in the database."""

    id: int = Field(default=None, primary_key=True)
    league_id: int = Field(foreign_key="league.id", index=True)
    week: int = Field(default=None)
    home_team: str = Field(default=None)
    away_team: str = Field(default=None)

    home_roster: list[str] = Field(default=None, sa_column=Column(JSON))
    away_roster: list[str] = Field(default=None, sa_column=Column(JSON))
    points: list = Field(default=None, sa_column=Column(JSON))

    home_score: int = Field(default=None)
    away_score: int = Field(default=None)

    league: "League" = Relationship(back_populates="games")
    stats: list["Stats"] = Relationship(back_populates="game")


STAT_VALUES = {
    "v2": {
        "goals": 10000,
        "assists": 10000,
        "second_assists": 8000,
        "d_blocks": 8000,
        "throw_aways": -5000,
        "threw_drops": -1000,
        "drops": -4000,
        "completions": 500,
        "catches": 500,
        "o_points_for": 1000,
        "d_points_for": 2000,
    },
    "v1": {
        "goals": 10000,
        "assists": 10000,
        "second_assists": 8000,
        "d_blocks": 8000,
        "throw_aways": -5000,
        "threw_drops": -2500,
        "drops": -5000,
        "completions": 1000,
        "catches": 1000,
    },
}


class Stats(SQLModel, table=True):
    """Represents a stats entry in the database."""

    id: int = Field(default=None, primary_key=True)
    league_id: int = Field(foreign_key="league.id", index=True)
    game_id: int = Field(foreign_key="game.id", index=True)
    player_id: int = Field(foreign_key="player.id", index=True)

    stat_values: str = Field(default="v2")

    goals: int = Field(default=0)
    assists: int = Field(default=0)
    second_assists: int = Field(default=0)
    d_blocks: int = Field(default=0)
    completions: int = Field(default=0)
    throw_aways: int = Field(default=0)
    threw_drops: int = Field(default=0)
    catches: int = Field(default=0)
    drops: int = Field(default=0)
    pulls: int = Field(default=0)
    callahan: int = Field(default=0)
    o_points_for: int = Field(default=0)
    o_points_against: int = Field(default=0)
    d_points_for: int = Field(default=0)
    d_points_against: int = Field(default=0)

    league: "League" = Relationship(back_populates="stats")
    game: "Game" = Relationship(back_populates="stats")
    player: "Player" = Relationship(back_populates="stats")

    def count_stat(self, stat):
        value = getattr(self, stat)
        setattr(self, stat, value + 1)

    # computed_field has a known issue with mypy
    # https://docs.pydantic.dev/2.0/usage/computed_fields/

    @computed_field  # type: ignore[prop-decorator]
    @property
    def pay(self) -> int:
        total = 0

        for stat, value in STAT_VALUES[self.stat_values].items():
            total += getattr(self, stat) * value

        return total

    @computed_field  # type: ignore[prop-decorator]
    @property
    def salary_per_point(self) -> int:
        if self.points_played == 0:
            return 0
        else:
            return round(self.pay / self.points_played)

    @property
    def _o_points_played(self) -> int:
        return self.o_points_for + self.o_points_against

    @property
    def _d_points_played(self) -> int:
        return self.d_points_for + self.d_points_against

    @computed_field  # type: ignore[prop-decorator]
    @property
    def points_played(self) -> int:
        return self._o_points_played + self._d_points_played

    @computed_field  # type: ignore[prop-decorator]
    @property
    def o_efficiency(self) -> float:
        if self._o_points_played == 0:
            return 0
        else:
            return self.o_points_for / self._o_points_played

    @computed_field  # type: ignore[prop-decorator]
    @property
    def d_efficiency(self) -> float:
        if self._d_points_played == 0:
            return 0
        else:
            return self.d_points_for / self._d_points_played

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_efficiency(self) -> float:
        if self.points_played == 0:
            return 0
        else:
            return (self.o_points_for + self.d_points_for) / self.points_played
