from .db import db

class League(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    zuluru_id = db.Column(db.Integer, unique=True)
    name = db.Column(db.Text, nullable=False)
    salary_version = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "zuluru_id": self.zuluru_id,
            "name": self.name,
        }
