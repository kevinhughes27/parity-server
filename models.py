from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    rank = db.Column(db.Integer)

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text)
    week = db.Column(db.Integer)
    teams = db.Column(db.Text)
    score = db.Column(db.Text)
    points = db.Column(db.Text)
    stats = db.Column(db.Text)

    def to_dict(self):
        return {
            "league": self.league,
            "week": self.week,
            "teams": json.loads(self.teams),
            "score": json.loads(self.score),
            "points": json.loads(self.points),
            "stats": json.loads(self.stats),
        }

class Stats(db.Model):
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
            "d_points_against": self.d_points_against
        }
