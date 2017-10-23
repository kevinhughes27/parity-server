from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy

from models import db, Game, Stats, Player
from utils import StatsCalculator

import os
import json
import datetime

# Directories
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'db.sqlite')
client_path = 'client/build'

def create_app():
    # App
    app = Flask(__name__, static_folder=client_path)
    if os.name == 'nt':
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////' + db_path

    # Database
    db.init_app(app)
    if (os.path.exists(db_path) == False):
        with app.app_context():
            db.create_all()

    # Upload
    @app.route('/upload', methods=['POST'])
    def upload():
        """
        @api {post} /upload From Stats Keeper Client
        @apiGroup Upload
        @apiDescription This is only path which creates new data on the server.
        The Stats Keeper Client uploads the stats to this endpoint and the server
        does any required post-processing before saving the game to the database.
         *
        @apiParam {String} league the name of the league
        @apiParam {Number} week the week number of the game
        @apiParam {Object} teams a key for each team containing an array of player names
        @apiParam {Array} event_string the array of events recored by the client
         *
        @apiParamExample {json} Example Upload:
            {
              "league": "ocua_16",
              "week": 1,
              "teams": {
                "Karma Down Under": ["Alison Ward"],
                "Kindha's Ongoing Disappointments": ["Jen Cluthe"]
              },
              "points": [
                {"type": "PULL", "firstActor": "Alison Ward"}
              ]
            }
        """
        game = Game()

        #HACK to fix seed
        try:
            points = json.loads(request.json['points'])['points']
        except:
            points = json.loads(request.json['points'])

        game.league = request.json['league']
        game.week = request.json['week']
        game.teams = json.dumps(request.json['teams'])
        game.score = json.dumps(request.json['score'])
        game.points = json.dumps(points)

        db.session.add(game)
        db.session.commit()

        stats = StatsCalculator(game.id, points).run()
        for stat in stats:
            db.session.add(stat[1])
        db.session.commit()

        return ('', 201)

    # API
    @app.route('/teams')
    def teams():
        """
        @api {get} /teams List
        @apiGroup Teams
        @apiDescription Scrapes the latest team and roster data from Zuluru
        @apiSuccess (200) {Object} teams key: team value: array of players
        @apiSuccessExample {json} Example Response:
           {
             "Kindha's Ongoing Disappointments": {
               "players": ["Kevin Hughes", "Jen Cluthe"],
               "malePlayers": ["Kevin Hughes"],
               "femalePlayers": ["Jen Cluthe"],
             },
             "Katie Parity": {
               "players": ["Dan Thomson", "Andrea Proulx"],
               "malePlayers": ["Dan Thomson"],
               "femalePlayers": ["Andrea Proulx"],
             }
           }
        """
        return jsonify({})

    @app.route('/stats')
    def stats():
        """
        @api {get} /stats Cumulative
        @apiGroup Weeks
        @apiDescription Returns the summed stats for all weeks keeping the latest salary. This response is calculated by summing all the games.
        @apiSuccess (200) {Object} stats returns the summed stats for all weeks
        @apiSuccessExample {json} Example Response:
           {
             "stats": {
               "Al Colantonio": {"Pulls": 2, "SalaryDelta": 2000, "Salary": 50000}
             }
           }
        """
        stats = {}
        for game in Game.query.all():
            stats = dict(list(stats.items()) + list(json.loads(game.stats).items()))
        return jsonify({"stats": stats})

    @app.route('/weeks')
    def weeks():
        """
        @api {get} /weeks List
        @apiGroup Weeks
        @apiDescription Returns an array of week numbers. This is calculated by a distinct query on game.week
        @apiSuccess (200) {Array} weeks returns an array of week numbers
        @apiSuccessExample {json} Example Response:
           [
             1,
             2,
             3
           ]
        """
        query = db.session.query(Game.week.distinct().label("week"))
        weeks = [row.week for row in query.all()]
        return jsonify(sorted(weeks))

    @app.route('/weeks/<num>')
    def week(num):
        """
        @api {get} /weeks/:week Get
        @apiGroup Weeks
        @apiDescription Returns all the stats for the given week. The week is
        calculated by merging all the games from that week.
        @apiSuccess (200) {Object} week returns a week
        @apiSuccessExample {json} Example Response:
           {
             "week": 1,
             "stats": {
               "Al Colantonio": {"Pulls": 1, "SalaryDelta": 2000, "Salary": 50000}
             }
           }
         """
        stats = {}
        for game in Game.query.filter_by(week=num):
            for player_stats in Stats.query.filter_by(game_id=game.id):
                player = Player.query.get(player_stats.player_id)

                teams = json.loads(game.teams).items()
                if player.name in teams[0][1]:
                    team = teams[0][0]
                else:
                    team = teams[1][0]

                data = player_stats.to_dict()
                data.update({'team': team})

                item = {}
                item[player.name] = data
                stats.update(item)

        return jsonify({"week": num, "stats": stats})

    @app.route('/games')
    def games():
        """
        @api {get} /games List
        @apiGroup Games
        @apiDescription Returns an array of all the games
        @apiSuccess (200) {Array} games returns an array of games
        """
        games = []
        for game in Game.query.all():
            games.append(game)

        return jsonify(games)

    @app.route('/games/<id>')
    def game(id):
        """
        @api {get} /games/:id Get
        @apiGroup Games
        @apiDescription Returns the data for a single game
        @apiSuccess (200) {Object} game returns a game
        @apiSuccessExample {json} Example Response:
           {
             "_id": "580bd3896df3906e619cd9f5",
             "week": 1,
             "teams": [
               "Karma Down Under": ["Alison Ward"],
               "Katie Parity": ["Dan Thomson"]
             ],
             "events": [
               "Pull,Al Colantonio"
             ],
             "stats": {
               "Al Colantonio": {"Pulls": 1, "SalaryDelta": 2000, "Salary": 50000}
             }
           }
        """
        game = Game.query.get(id)
        return jsonify(game.to_dict())

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

    return app

# Boot
if __name__ == '__main__':
    app = create_app()
    app.run(use_reloader=True)
