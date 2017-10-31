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
            "teams": {
                "home_team": json.loads(self.home_roster),
                "away_team": json.loads(self.away_roster)
            },
            "score": {
                "home_team": self.home_score,
                "away_team": self.away_score
            },
            "points": json.loads(self.points),
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
