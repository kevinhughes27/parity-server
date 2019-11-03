from .db import db

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zuluru_id = db.Column(db.Integer, unique=True)
    league_id = db.Column(db.Integer, db.ForeignKey('league.id'), nullable=False)
    name = db.Column(db.Text)
