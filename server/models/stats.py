from typing import Dict, Any
from sqlmodel import (
    Field,
    SQLModel,
    Relationship,
)

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
