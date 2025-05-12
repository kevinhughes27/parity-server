from sqlmodel import Field, SQLModel, Relationship
from typing import List


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
