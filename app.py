from flask import (
    Flask,
    flash,
    request,
    redirect,
    jsonify,
    send_from_directory,
)

from flask_sqlalchemy import SQLAlchemy
from models.db import db
import os

# Directories
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'db.sqlite')
client_path = 'client/build'

# App
app = Flask(__name__, static_folder=client_path)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////' + db_path

# InitDB
db.init_app(app)
if (os.path.exists(db_path) == False):
    db.create_all()

# Upload
@app.route('/upload', methods=['POST'])
def upload():
    game = Game()
    game.league = request.form['league']
    game.week = calculate_week()
    game.teams = request.form['teams']
    game.score = request.form['score']
    game.points = request.form['points']

    calculate_stats(game.points)
    db.session.commit()

# API
@app.route('/weeks')
def weeks():
    return jsonify([1,2,3])

@app.route('/weeks/<num>')
def week(num):
    return jsonify({})


# Client
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def client(path):
    if(path == ""):
        return send_from_directory(client_path, 'index.html')
    else:
        if(os.path.exists(client_path + '/' + path)):
            return send_from_directory(client_path, path)
        else:
            return send_from_directory(client_path, 'index.html')

# Utils
def calculate_week():
    return 1

def calculate_stats(points):
    return {}

# Boot
if __name__ == '__main__':
    app.run(use_reloader=True)
