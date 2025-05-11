from sqlmodel import Field, SQLModel, create_engine, Session, select, Relationship


class Player(SQLModel, table=True):
    id: int = Field(default=None, primary_key=True)
    name: str = Field()
    gender: str = Field()

    league_id: int = Field(foreign_key="league.id", index=True)
    team_id: int = Field(default=None, foreign_key="team.id", index=True)

    league: "League" = Relationship(back_populates="players")
    team: "Team" = Relationship(back_populates="players")

    @property
    def is_male(self):
        return self.gender == "male"

# from .db import db
# from .team import Team
#
#
# class Player(db.Model):
#     __table_args__ = (
#         db.UniqueConstraint(
#             "league_id", "zuluru_id", name="unique_zuluru_player_per_league"
#         ),
#     )
#
#     id = db.Column(db.Integer, primary_key=True, autoincrement=True)
#     zuluru_id = db.Column(db.Integer)
#     league_id = db.Column(db.Integer, db.ForeignKey("league.id"), nullable=False)
#     team_id = db.Column(db.Integer, db.ForeignKey("team.id"))
#
#     name = db.Column(db.Text)
#     gender = db.Column(db.Text)
#     fallback_salary = db.Column(db.Integer)
#
#     @property
#     def is_male(self):
#         return self.gender == "male"
#
#     @property
#     def team(self):
#         if self.team_id:
#             return db.session.get(Team, self.team_id)
#         else:
#             return None
#
#     @property
#     def team_name(self):
#         if self.team:
#             return self.team.name
#         else:
#             "Substitute"
#
#     @property
#     def salary(self):
#         if hasattr(self, "_salary"):
#             return self._salary
#
#     @salary.setter
#     def salary(self, salary):
#         self._salary = salary
#
#     def to_dict(self):
#         return {"name": self.name, "team": self.team_name, "salary": self.salary}
