from .db import db
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
        return Team.query.get(self.team_id)

    @property
    def salary(self):
        pro_rated_number_of_points = 15
        pro_rated_salary = self._avg_salary_per_point_based_on_history * pro_rated_number_of_points
        return round(pro_rated_salary)

    @property
    def _avg_salary_per_point_based_on_history(self):
        player_stats = Stats.query.filter_by(player_id=self.id)
        salaries = [ps.salary_per_point for ps in player_stats]

        if len(salaries) > 0:
            return sum(salaries) / len(salaries)
        else:
            return 0
