from db import db

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.Text)
    week = db.Column(db.Integer)
    teams = db.Column(db.Text)
    score = db.Column(db.Text)
    points = db.Column(db.Text)
