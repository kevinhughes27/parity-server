from sqlmodel import Field, SQLModel, Relationship
from typing import List


class League(SQLModel, table=True):
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
