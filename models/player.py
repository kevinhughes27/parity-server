from models.db import db
import json

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    rank = db.Column(db.Integer)

    def to_dict(self):
        return {
            "name": json.loads(self.teams),
            "rank": json.loads(self.stats),
        }
