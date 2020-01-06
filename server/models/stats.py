from .db import db

class Stats(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)

    stat_values = db.Column(db.Text, nullable=False)

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

    STAT_VALUES = {
        'v2': {
            'goals': 10000,
            'assists': 10000,
            'second_assists': 8000,
            'd_blocks': 8000,
            'throw_aways': -5000,
            'threw_drops': -1000,
            'drops': -4000,
            'completions': 500,
            'catches': 500,
            'o_points_for': 1000,
            'd_points_for': 2000
        },
        'v1': {
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
    }

    def __init__(self, league_id, game_id, player_id, stat_values):
        self.league_id = league_id
        self.game_id = game_id
        self.player_id = player_id

        self.stat_values = stat_values

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

        for stat, value in self.STAT_VALUES[self.stat_values].items():
            total += getattr(self, stat) * value

        return total

    @property
    def salary_per_point(self):
        if self.points_played == 0:
            return 0
        else:
            return round(self.pay / self.points_played)

    @property
    def _o_points_played(self):
        return self.o_points_for + self.o_points_against

    @property
    def _d_points_played(self):
        return self.d_points_for + self.d_points_against

    @property
    def points_played(self):
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
        if self.points_played == 0:
            return 0
        else:
            return (self.o_points_for + self.d_points_for) / self.points_played

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
            "points_played": self.points_played,
            "pay": self.pay,
            "salary_per_point": self.salary_per_point
        }
