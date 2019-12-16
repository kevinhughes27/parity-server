from datetime import datetime
from .db import db
from .league import League

class Matchup(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=False)
    home_team_id = db.Column(db.Integer, db.ForeignKey('team.zuluru_id'), nullable=False)
    away_team_id = db.Column(db.Integer, db.ForeignKey('team.zuluru_id'), nullable=False)
    week = db.Column(db.Integer)
    game_start = db.Column(db.DateTime)
    game_end = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "league_id": self.league_id,
            "home_team": self.home_team_id,
            "away_team": self.away_team_id,
            "week": self.week,
            "game_start": self.game_start.isoformat('_'),
            "game_end": self.game_end.isoformat('_')
        }
