from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)


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
        if self.name == 'Heather Wallace':
            return self._heather_salary()
        else:
            return self._normal_player_salary()

    def _heather_salary(self):
        real_salary = self._normal_player_salary()

        if real_salary < self._allan_salary():
            return self._allan_salary() + 5
        else:
            return real_salary

    def _allan_salary(self):
        allan = Player.query.filter_by(name='Allan Godding').first()
        return allan.salary

    def _normal_player_salary(self):
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


class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text)
    week = db.Column(db.Integer)
    home_team = db.Column(db.Text)
    away_team = db.Column(db.Text)
    home_roster = db.Column(db.Text)
    away_roster = db.Column(db.Text)
    home_score = db.Column(db.Integer)
    away_score = db.Column(db.Integer)
    points = db.Column(db.Text)

    @property
    def players(self):
        return json.loads(self.home_roster) + json.loads(self.away_roster)

    def to_dict(self):
        return {
            "id": self.id,
            "league": self.league,
            "week": self.week,
            "homeTeam": self.home_team,
            "homeScore": self.home_score,
            "homeRoster": json.loads(self.home_roster),
            "awayTeam": self.away_team,
            "awayScore": self.away_score,
            "awayRoster": json.loads(self.away_roster),
            "points": json.loads(self.points)
        }


class Stats(db.Model):
    SALARY = {
        'goals': 10000,
        'assists': 10000,
        'second_assists': 8000,
        'd_blocks': 8000,
        'throw_aways': -5000,
        'threw_drops': -2500,
        'drops': -5000,
        'completions': 1000,
        'catches': 1000
    }

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, nullable=False)
    player_id = db.Column(db.Integer, nullable=False)
    goals = db.Column(db.Integer)
    assists = db.Column(db.Integer)
    second_assists = db.Column(db.Integer)
    d_blocks = db.Column(db.Integer)
    completions = db.Column(db.Integer)
    throw_aways = db.Column(db.Integer)
    threw_drops = db.Column(db.Integer)
    catches = db.Column(db.Integer)
    drops = db.Column(db.Integer)
    pulls = db.Column(db.Integer)
    callahan = db.Column(db.Integer)
    o_points_for = db.Column(db.Integer)
    o_points_against = db.Column(db.Integer)
    d_points_for = db.Column(db.Integer)
    d_points_against = db.Column(db.Integer)

    def __init__(self, game_id, player_id):
        self.game_id = game_id
        self.player_id = player_id
        self.goals = 0
        self.assists = 0
        self.second_assists = 0
        self.d_blocks = 0
        self.completions = 0
        self.throw_aways = 0
        self.threw_drops = 0
        self.catches = 0
        self.drops = 0
        self.pulls = 0
        self.callahan = 0
        self.o_points_for = 0
        self.o_points_against = 0
        self.d_points_for = 0
        self.d_points_against = 0

    def count_stat(self, stat):
        value = getattr(self, stat)
        setattr(self, stat, value + 1)

    @property
    def pay(self):
        total = 0
        total += self.goals * self.SALARY['goals']
        total += self.assists * self.SALARY['assists']
        total += self.second_assists * self.SALARY['second_assists']
        total += self.d_blocks * self.SALARY['d_blocks']
        total += self.completions * self.SALARY['completions']
        total += self.throw_aways * self.SALARY['throw_aways']
        total += self.threw_drops * self.SALARY['threw_drops']
        total += self.catches * self.SALARY['catches']
        total += self.drops * self.SALARY['drops']

        return total

    @property
    def salary_per_point(self):
        if self._points_played == 0:
            return 0
        else:
            return self.pay / self._points_played

    @property
    def _o_points_played(self):
        return self.o_points_for + self.o_points_against

    @property
    def _d_points_played(self):
        return self.d_points_for + self.d_points_against

    @property
    def _points_played(self):
        return self._o_points_played + self._d_points_played

    @property
    def salary(self):
        player = Player.query.get(self.player_id)
        return player.salary if player != None else 0

    @property
    def o_efficiency(self):
        if self._o_points_played == 0:
            return 0
        else:
            return self.o_points_for / self._o_points_played

    @property
    def d_efficiency(self):
        if self._d_points_played == 0:
            return 0
        else:
            return self.d_points_for / self._d_points_played

    @property
    def total_efficiency(self):
        if self._points_played == 0:
            return 0
        else:
            return (self.o_points_for + self.d_points_for) / self._points_played

    def to_dict(self):
        return {
            "goals": self.goals,
            "assists": self.assists,
            "second_assists": self.second_assists,
            "d_blocks": self.d_blocks,
            "completions": self.completions,
            "throw_aways": self.throw_aways,
            "threw_drops": self.threw_drops,
            "catches": self.catches,
            "drops": self.drops,
            "pulls": self.pulls,
            "callahan": self.callahan,
            "o_points_for": self.o_points_for,
            "o_points_against": self.o_points_against,
            "d_points_for": self.d_points_for,
            "d_points_against": self.d_points_against,
            "pay": self.pay,
            "salary_per_point": self.salary_per_point,
            "salary": self.salary,
            "o_efficiency": self.o_efficiency,
            "d_efficiency": self.d_efficiency,
            "total_efficiency": self.total_efficiency
        }
