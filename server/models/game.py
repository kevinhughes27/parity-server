from typing import List, Dict, Any
from pydantic.fields import PrivateAttr
from sqlmodel import Field, SQLModel, Relationship, JSON, Column


class Game(SQLModel, table=True):
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

    _game_stats: PrivateAttr(default=None)

    @property
    def players(self) -> List[Dict[str, Any]]:
        return self.home_roster + self.away_roster

    # set the computed stats for the response
    def set_game_stats(self, stats):
        self._game_stats = stats

    def to_dict_with_properties(self) -> Dict[str, Any]:
        data = self.model_dump()
        data["stats"] = self._game_stats
        data["homeTeam"] = self.home_team
        data["awayTeam"] = self.away_team
        return data
