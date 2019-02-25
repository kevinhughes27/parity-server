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
    fallback_salary = db.Column(db.Integer)

    @property
    def is_male(self):
        return self.gender == 'male'

    @property
    def team(self):
        if self.team_id:
            from .team import Team
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
        if self.has_stats:
            pro_rated_number_of_points = 15
            pro_rated_salary = self._avg_salary_per_point_based_on_history * pro_rated_number_of_points
            return round(pro_rated_salary)
        else:
            return self._fallback_salary

    @property
    def stats(self):
        if not hasattr(self, '_stats'):
            self._stats = Stats.query.filter_by(player_id=self.id).all()
        return self._stats

    @property
    def has_stats(self):
        return len(self.stats) > 0

    @property
    def _avg_salary_per_point_based_on_history(self):
        salaries = [ps.salary_per_point for ps in self.stats]
        return sum(salaries) / len(salaries)

    @property
    def _fallback_salary(self):
        if self.fallback_salary:
            return self.fallback_salary

        all_players = Player.query.all()
        same_gender_salaries = [p.salary for p in all_players if p.is_male == self.is_male and p.has_stats]

        if len(same_gender_salaries) == 0:
            return 0
        else:
            avg_salary = sum(same_gender_salaries) / len(same_gender_salaries)
            return round(avg_salary)

    def to_dict(self):
        return {
            "name": self.name,
            "team": self.team_name,
            "salary": self.salary
        }
