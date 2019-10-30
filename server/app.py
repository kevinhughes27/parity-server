from flask import Flask, request, jsonify, send_from_directory
from flask_caching import Cache

from models import db, Game, Stats, Team, Player
from upload import StatsCalculator

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
    game = Game()

    # save response to file if debugging
    debug = False
    if debug:
        now = datetime.datetime.now()
        fo = open('data/test/' + str(now) + '.json', 'w')
        fo.write(json.dumps(request.json, indent=2, sort_keys=True))
        fo.close()

    # save the game to the database
    game.league = request.json['league']
    game.week = request.json['week']

    game.home_team = request.json['homeTeam']
    game.away_team = request.json['awayTeam']

    game.home_score = request.json['homeScore']
    game.away_score = request.json['awayScore']

    game.home_roster = json.dumps(request.json['homeRoster'])
    game.away_roster = json.dumps(request.json['awayRoster'])

    points = request.json['points']
    game.points = json.dumps(points)

    db.session.add(game)
    db.session.commit()

    # calculate and save stats
    stats = StatsCalculator(points, game.id).run()
    for name, player_stats in stats:
        db.session.add(player_stats)
    db.session.commit()

    # clear the stats cache
    cache.clear()

    return ('', 201)


# API
@cache.cached()
@app.route('/api/teams')
def teams():
    teams = []
    for team in Team.query.all():
        players = []

        for player in Player.query.filter_by(team_id=team.id):
            players.append({
                'id': player.zuluru_id,
                'name': player.name,
                'is_male': player.is_male
            })

        teams.append({
            'id': team.zuluru_id,
            'name': team.name,
            'players': players
        })

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


def build_stats_response(games):
    stats = {}
    stats_to_average = ['pay', 'salary_per_point', 'o_efficiency', 'd_efficiency', 'total_efficiency']

    # rollup stats per game
    for game in games:
        for player_stats in Stats.query.filter_by(game_id=game.id):
            player = Player.query.get(player_stats.player_id)
            data = player_stats.to_dict()

            # aggregate all stats for the player
            if player.name in stats:
                existing_data = stats[player.name]
                summed_stats = { s: data.get(s, 0) + existing_data.get(s, 0) for s in data.keys() }
                stats[player.name].update(summed_stats)
                stats[player.name]['games_played'] += 1
            else:
                stats.update({player.name: data})
                stats[player.name]['games_played'] = 1

            # set the team for the player
            if "(S)" in player.name:
                team = "Substitute"
            elif player.name in json.loads(game.home_roster):
                team = game.home_team
            elif player.name in json.loads(game.away_roster):
                team = game.away_team
            elif player.team_id:
                team = Team.query.get(player.team_id).name
            else:
                team = 'Unknown'

            stats[player.name].update({'team': team})

            if player.gender:
                stats[player.name].update({'gender': player.gender})

    # resolve averages
    for player in stats:
        for stat in stats_to_average:
            stats[player][stat] = stats[player][stat] / stats[player]['games_played']

        stats[player]['pay'] = round(stats[player]['pay'])
        stats[player]['salary_per_point'] = round(stats[player]['salary_per_point'])
        stats[player].pop('games_played')

    return stats


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
