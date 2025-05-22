from config import STAT_VALUES
from datetime import datetime
from typing import Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
from typing import List, Optional


class League(SQLModel, table=True):
    """Represents a league in the database."""

    id: int = Field(default=None, primary_key=True)
    zuluru_id: int = Field(default=None, unique=True, index=True)
    name: str = Field(index=True)
    stat_values: str
    salary_calc: str

    teams: List["Team"] = Relationship(back_populates="league")
    players: List["Player"] = Relationship(back_populates="league")
    games: List["Game"] = Relationship(back_populates="league")
    stats: List["Stats"] = Relationship(back_populates="league")
    matchups: List["Matchup"] = Relationship(back_populates="league")


class Player(SQLModel, table=True):
    """Represents a player in the database."""

    id: int = Field(default=None, primary_key=True)
    name: str = Field()
    gender: Optional[str] = Field()
    fallback_salary: Optional[float] = Field()

    league_id: int = Field(foreign_key="league.id", index=True)
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)

    league: "League" = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")
    stats: list["Stats"] = Relationship(back_populates="player")

    @property
    def is_male(self):
        return self.gender == "male"

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
    players: List["Player"] = Relationship(back_populates="team")

    home_matchups: List["Matchup"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Matchup.home_team_id"},
        back_populates="home_team",
    )
    away_matchups: List["Matchup"] = Relationship(
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

    home_roster: dict = Field(default=None, sa_column=Column(JSON))
    away_roster: dict = Field(default=None, sa_column=Column(JSON))
    points: dict = Field(default=None, sa_column=Column(JSON))

    home_score: int = Field(default=None)
    away_score: int = Field(default=None)

    league: "League" = Relationship(back_populates="games")
    stats: List["Stats"] = Relationship(back_populates="game")


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

    @property
    def pay(self):
        total = 0

        for stat, value in STAT_VALUES[self.stat_values].items():
            total += getattr(self, stat) * value

        return total

    @property
    def salary_per_point(self):
        if self.points_played == 0:
            return 0
        else:
            return round(self.pay / self.points_played)

    @property
    def _o_points_played(self):
        return self.o_points_for + self.o_points_against

    @property
    def _d_points_played(self):
        return self.d_points_for + self.d_points_against

    @property
    def points_played(self):
        return self._o_points_played + self._d_points_played

    @property
    def o_efficiency(self):
        if self._o_points_played == 0:
            return 0
        else:
            return self.o_points_for / self._o_points_played

    @property
    def d_efficiency(self):
        if self._d_points_played == 0:
            return 0
        else:
            return self.d_points_for / self._d_points_played

    @property
    def total_efficiency(self):
        if self.points_played == 0:
            return 0
        else:
            return (self.o_points_for + self.d_points_for) / self.points_played

    def to_dict_with_properties(self) -> Dict[str, Any]:
        return {
            "goals": self.goals,
            "assists": self.assists,
            "second_assists": self.second_assists,
            "d_blocks": self.d_blocks,
            "completions": self.completions,
            "throw_aways": self.throw_aways,
            "threw_drops": self.threw_drops,
            "catches": self.catches,
            "drops": self.drops,
            "pulls": self.pulls,
            "callahan": self.callahan,
            "o_points_for": self.o_points_for,
            "o_points_against": self.o_points_against,
            "d_points_for": self.d_points_for,
            "d_points_against": self.d_points_against,
            "o_efficiency": self.o_efficiency,
            "d_efficiency": self.d_efficiency,
            "total_efficiency": self.total_efficiency,
            "points_played": self.points_played,
            "pay": self.pay,
            "salary_per_point": self.salary_per_point,
        }
