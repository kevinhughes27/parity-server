from .db import db

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league_id = db.Column(db.Integer, nullable=False)
    zuluru_id = db.Column(db.Integer, unique=True)
    name = db.Column(db.Text)
