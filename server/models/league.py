from .db import db

class League(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text, nullable=False)
    zuluru_id = db.Column(db.Integer, unique=True)
    name = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "league": self.league,
            "zuluru_id": self.zuluru_id,
            "name": self.name,
        }
