from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship


class Matchup(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)

    league_id: int = Field(foreign_key="league.id", index=True)
    home_team_id: int = Field(foreign_key="team.id", index=True)
    away_team_id: int = Field(foreign_key="team.id", index=True)

    week: int = Field(default=None)
    game_start: datetime = Field(default=None)
    game_end: datetime = Field(default=None)

    league: "League" = Relationship(back_populates="matchups")
    home_team: "Team" = Relationship(sa_relationship_kwargs={"foreign_keys": "Matchup.home_team_id"}, back_populates="home_matchups")
    away_team: "Team" = Relationship(sa_relationship_kwargs={"foreign_keys": "Matchup.away_team_id"}, back_populates="away_matchups")
