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

    def is_male(self):
        return self.gender == 'male'


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

    def to_dict(self):
        return {
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
    goals = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)
    second_assists = db.Column(db.Integer, default=0)
    d_blocks = db.Column(db.Integer, default=0)
    completions = db.Column(db.Integer, default=0)
    throw_aways = db.Column(db.Integer, default=0)
    threw_drops = db.Column(db.Integer, default=0)
    catches = db.Column(db.Integer, default=0)
    drops = db.Column(db.Integer, default=0)
    pulls = db.Column(db.Integer, default=0)
    callahan = db.Column(db.Integer, default=0)
    o_points_for = db.Column(db.Integer, default=0)
    o_points_against = db.Column(db.Integer, default=0)
    d_points_for = db.Column(db.Integer, default=0)
    d_points_against = db.Column(db.Integer, default=0)

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
    def _points_played(self):
        return self.o_points_for + self.o_points_against + self.d_points_for + self.d_points_against

    @property
    def salary(self):
        pro_rated_number_of_points = 15
        return self._avg_salary_per_point_based_on_history * pro_rated_number_of_points

    @property
    def _avg_salary_per_point_based_on_history(self):
        player_stats = Stats.query.filter_by(player_id=self.player_id)
        salaries = [ps.salary_per_point for ps in player_stats]

        if len(salaries) > 0:
            return sum(salaries) / len(salaries)
        else:
            return 0

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
            "salary": self.salary
        }
