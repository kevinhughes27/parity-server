from typing import List, Dict, Any
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

    @property
    def players(self) -> List[Dict[str, Any]]:
        return self.home_roster + self.away_roster
