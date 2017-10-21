from models.db import db
import json

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
