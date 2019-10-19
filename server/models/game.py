from .db import db
import json

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text, nullable=False)
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

    def to_dict(self, include_points=False):
        output = {
            "id": self.id,
            "league": self.league,
            "week": self.week,
            "homeTeam": self.home_team,
            "homeScore": self.home_score,
            "homeRoster": json.loads(self.home_roster),
            "awayTeam": self.away_team,
            "awayScore": self.away_score,
            "awayRoster": json.loads(self.away_roster)
        }

        if include_points:
            output["points"] = json.loads(self.points)

        return output
