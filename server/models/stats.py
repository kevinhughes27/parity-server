from .db import db
import json

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
            "o_efficiency": self.o_efficiency,
            "d_efficiency": self.d_efficiency,
            "total_efficiency": self.total_efficiency,
            "pay": self.pay,
            "salary_per_point": self.salary_per_point
        }
