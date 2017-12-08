from .db import db
import json

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zuluru_id = db.Column(db.Integer, unique=True)
    name = db.Column(db.Text)
