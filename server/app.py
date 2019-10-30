from flask import Flask, request, jsonify, send_from_directory
from flask_caching import Cache

from models import db, Game, Stats, Team, Player
from lib import StatsCalculator, build_stats_response, build_teams_response

import os
import json
import datetime


# Settings
if os.environ.get('APP_SETTINGS') == None:
    os.environ['APP_SETTINGS'] = 'config.DevelopmentConfig'

react_app_path = '../web/build'


# Init
app = Flask(__name__, static_folder=react_app_path)
app.config.from_object(os.environ['APP_SETTINGS'])
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
db.init_app(app)


# Upload
@app.route('/upload', methods=['POST'])
def upload():
    # debug_upload(request.json)

    # save the game to the database
    game = save_game(request.json)

    # calculate and save stats
    stats = StatsCalculator(game).run()

    # clear the stats cache
    cache.clear()

    return ('', 201)


def debug_upload(upload_json):
    now = datetime.datetime.now()
    fo = open('data/test/' + str(now) + '.json', 'w')
    fo.write(json.dumps(request.json, indent=2, sort_keys=True))
    fo.close()


def save_game(upload_json):
    game = Game()

    game.league = upload_json['league']
    game.week = upload_json['week']

    game.home_team = upload_json['homeTeam']
    game.away_team = upload_json['awayTeam']

    game.home_score = upload_json['homeScore']
    game.away_score = upload_json['awayScore']

    game.home_roster = upload_json['homeRoster']
    game.away_roster = upload_json['awayRoster']

    game.points = upload_json['points']

    db.session.add(game)
    db.session.commit()

    return game


# API
@cache.cached()
@app.route('/api/teams')
def teams():
    teams = build_teams_response()
    return jsonify(teams)


@cache.cached()
@app.route('/api/players')
def players():
    query = Player.query.filter(Player.team_id != None)
    players = [player.to_dict() for player in query.all()]
    return jsonify(players)


@cache.cached()
@app.route('/api/games')
def games():
    games = [game.to_dict() for game in Game.query.all()]
    return jsonify(games)


@cache.cached()
@app.route('/api/games/<id>')
def game(id):
    game = Game.query.get(id)
    return jsonify(game.to_dict(include_points=True))


@cache.cached()
@app.route('/api/weeks')
def weeks():
    query = db.session.query(Game.week.distinct().label("week"))
    weeks = [row.week for row in query.all()]
    return jsonify(sorted(weeks))


@cache.cached()
@app.route('/api/weeks/<num>')
def week(num):
    games = Game.query.filter_by(week=num)
    stats = build_stats_response(games)
    return jsonify({"week": num, "stats": stats})


@cache.cached()
@app.route('/api/stats')
def stats():
    games = Game.query.order_by(Game.week.asc())
    stats = build_stats_response(games)
    return jsonify({"week": 0, "stats": stats})


# React App
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def react_app(path):
    if(path == ""):
        return send_from_directory(react_app_path, 'index.html')
    else:
        if(os.path.exists(react_app_path + '/' + path)):
            return send_from_directory(react_app_path, path)
        else:
            return send_from_directory(react_app_path, 'index.html')


# Boot server for Development / Test
if __name__ == '__main__':

    # Auto create development database
    if app.config.get('DEVELOPMENT'):
        with app.app_context():
            db.create_all()

    app.run(use_reloader=True)
