from .db import db
from .team import Team
from .stats import Stats

class Player(db.Model):
    __table_args__ = (
        db.UniqueConstraint('league_id', 'zuluru_id', name='unique_zuluru_player_per_league'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    zuluru_id = db.Column(db.Integer)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'))

    name = db.Column(db.Text)
    gender = db.Column(db.Text)
    fallback_salary = db.Column(db.Integer)

    @property
    def is_male(self):
        return self.gender == 'male'

    @property
    def team(self):
        if self.team_id:
            return Team.query.get(self.team_id)
        else:
            return None

    @property
    def team_name(self):
        if self.team:
            return self.team.name
        else:
            'Substitute'

    @property
    def salary(self):
        if hasattr(self, '_salary'):
            return self._salary

    @salary.setter
    def salary(self, salary):
        self._salary = salary

    def to_dict(self):
        return {
            "name": self.name,
            "team": self.team_name,
            "salary": self.salary
        }
