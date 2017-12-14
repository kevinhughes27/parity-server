from .db import db
from .team import Team
from .stats import Stats
import json

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zuluru_id = db.Column(db.Integer, unique=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'))
    name = db.Column(db.Text)
    gender = db.Column(db.Text)

    @property
    def is_male(self):
        return self.gender == 'male'

    @property
    def team(self):
        from .team import Team
        return Team.query.get(self.team_id)

    @property
    def salary(self):
        pro_rated_number_of_points = 15
        pro_rated_salary = self._avg_salary_per_point_based_on_history * pro_rated_number_of_points
        return round(pro_rated_salary)

    @property
    def has_stats(self):
        self.stats = Stats.query.filter_by(player_id=self.id)
        return len(self.stats) > 0

    @property
    def _avg_salary_per_point_based_on_history(self):
        if self.has_stats:
            salaries = [ps.salary_per_point for ps in self.stats]
            return sum(salaries) / len(salaries)
        else:
            return self._fallback_salary

    @property
    def _fallback_salary(self):
        team_mates = Player.query.filter_by(team_id=self.team_id)
        same_gender_salaries = [p.salary for p in team_mates if p.is_male == self.is_male and p.has_stats]
        avg_salary = sum(same_gender_salaries) / len(same_gender_salaries)

    def to_dict(self):
        return {
            "name": self.name,
            "team": self.team.name,
            "salary": self.salary
        }
