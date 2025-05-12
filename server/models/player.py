from typing import Dict, Any, Optional
from pydantic.fields import PrivateAttr
from sqlmodel import Field, SQLModel, Relationship


class Player(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    name: str = Field()
    gender: str = Field()

    league_id: int = Field(foreign_key="league.id", index=True)
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)

    league: "League" = Relationship(back_populates="players")
    team: Optional["Team"] = Relationship(back_populates="players")
    stats: list["Stats"] = Relationship(back_populates="player")

    _salary: PrivateAttr(default=None)

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

    def to_dict_with_properties(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "team": self.team_name,
            "salary": self.salary
        }
