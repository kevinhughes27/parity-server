from .db import db
from .json_column import JsonColumn

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text)
    week = db.Column(db.Integer)
    home_team = db.Column(JsonColumn)
    away_team = db.Column(JsonColumn)
    home_roster = db.Column(JsonColumn)
    away_roster = db.Column(JsonColumn)
    home_score = db.Column(db.Integer)
    away_score = db.Column(db.Integer)
    points = db.Column(JsonColumn)

    @property
    def players(self):
        return self.home_roster + self.away_roster

    def to_dict(self, include_points=False):
        output = {
            "id": self.id,
            "league": self.league,
            "week": self.week,
            "homeTeam": self.home_team,
            "homeScore": self.home_score,
            "homeRoster": self.home_roster,
            "awayTeam": self.away_team,
            "awayScore": self.away_score,
            "awayRoster": self.away_roster
        }

        if include_points:
            output["points"] = self.points

        return output
