from .db import db
import json

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text, nullable=False)
    zuluru_id = db.Column(db.Integer, unique=True)
    name = db.Column(db.Text)
