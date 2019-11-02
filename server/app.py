from flask import Flask, request, jsonify, send_from_directory
from flask_caching import Cache

from models import db, Game, Stats, Team, Player, League
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


# Submit Game
@app.route('/submit_game', methods=['POST'])
def upload():
    # save the game to the database
    game = save_game(request.json)

    # calculate and save stats
    stats = StatsCalculator(game).run()

    # clear the stats cache
    cache.clear()

    return ('', 201)


def save_game(upload_json):
    game = Game()

    game.league_id = upload_json['league_id']
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
@app.route('/api/<league_id>/teams')
def teams(league_id):
    teams = build_teams_response(league_id)
    return jsonify(teams)


@cache.cached()
@app.route('/api/<league_id>/players')
def players(league_id):
    query = Player.query.filter(Player.league_id == league_id, Player.team_id != None)
    players = [player.to_dict() for player in query.all()]
    return jsonify(players)


@cache.cached()
@app.route('/api/<league_id>/games')
def games(league_id):
    games = [game.to_dict() for game in Game.query.filter_by(league_id=league_id)]
    return jsonify(games)


@cache.cached()
@app.route('/api/<league_id>/games/<id>')
def game(league_id, id):
    game = Game.query.filter_by(league_id=league_id, id=id).first()
    return jsonify(game.to_dict(include_points=True))


@cache.cached()
@app.route('/api/leagues')
def leagues():
    # 6 and 7 need their data format updated and then synced
    league_ids = [1,2,3,4,5]
    query = League.query.filter(League.id.in_(league_ids)).order_by(League.zuluru_id.desc())
    leagues = [league.to_dict() for league in query]
    return jsonify(leagues)


@cache.cached()
@app.route('/api/<league_id>/weeks')
def weeks(league_id):
    games = Game.query.filter_by(league_id=league_id).all()
    weeks = [game.week for game in games]
    return jsonify(sorted(weeks))


@cache.cached()
@app.route('/api/<league_id>/weeks/<num>')
def week(league_id, num):
    games = Game.query.filter_by(league_id=league_id, week=num)
    stats = build_stats_response(games)
    return jsonify({"week": num, "stats": stats})


@cache.cached()
@app.route('/api/<league_id>/stats')
def stats(league_id):
    games = Game.query.filter_by(league_id=league_id).order_by(Game.week.asc())
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
