from .db import db
from .league import League

class Matchup(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=False)
    home_team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    week = db.Column(db.Integer)
    game = db.Column(db.Integer)
    date = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "league_id": self.league_id,
            "home_team": self.home_team_id,
            "away_team": self.away_team_id,
            "week": self.week,
            "game": self.game,
            "date": self.date
        }
