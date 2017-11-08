from flask import Flask, request, jsonify, send_from_directory

from models import db, Game, Stats, Team, Player
from utils import StatsCalculator

import os
import json
import datetime

client_path = '../client/build'

def create_app():
    app = Flask(__name__, static_folder=client_path)

    if os.environ.get('APP_SETTINGS') == None:
        os.environ['APP_SETTINGS'] = 'config.DevelopmentConfig'

    app.config.from_object(os.environ['APP_SETTINGS'])
    db.init_app(app)


    # Upload
    @app.route('/upload', methods=['POST'])
    def upload():
        game = Game()

        debug = False
        if debug:
            now = datetime.datetime.now()
            fo = open('data/test/' + str(now) + '.json', 'w')
            fo.write(json.dumps(request.json))
            fo.close()

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

        stats = StatsCalculator(game.id, points).run()
        for stat in stats:
            db.session.add(stat[1])
        db.session.commit()

        return ('', 201)


    # API
    @app.route('/teams')
    def teams():
        teams = {}
        for team in Team.query.all():
            teams[team.name] = {
                'players': [],
                'malePlayers': [],
                'femalePlayers': []
            }
            for player in Player.query.filter_by(team_id=team.id):
                teams[team.name]['players'].append(player.name)
                if player.is_male():
                    teams[team.name]['malePlayers'].append(player.name)
                else:
                    teams[team.name]['femalePlayers'].append(player.name)

        return jsonify(teams)


    @app.route('/stats')
    def stats():
        games = Game.query.order_by("week asc")
        stats = build_stats_response(games)
        return jsonify({"week": 0, "stats": stats})


    @app.route('/weeks')
    def weeks():
        query = db.session.query(Game.week.distinct().label("week"))
        weeks = [row.week for row in query.all()]
        return jsonify(sorted(weeks))


    @app.route('/weeks/<num>')
    def week(num):
        games = Game.query.filter_by(week=num)
        stats = build_stats_response(games)
        return jsonify({"week": num, "stats": stats})


    def build_stats_response(games):
        stats = {}
        week = 0

        for game in games:
            week = max(week, game.week)
            for player_stats in Stats.query.filter_by(game_id=game.id):
                player = Player.query.get(player_stats.player_id)

                if player.name in json.loads(game.home_roster):
                    team = game.home_team
                else:
                    team = game.away_team

                data = player_stats.to_dict()
                data.update({'team': team})

                if player.name in stats:
                    existing_data = stats[player.name]
                    stats_to_sum = data.keys() - ['pay', 'salary', 'salary_per_point']
                    summed_stats = { s: data.get(s, 0) + existing_data.get(s, 0) for s in stats_to_sum }
                    stats[player.name].update(summed_stats)
                else:
                    stats.update({player.name: data})

        # display salary
        ## multiply salary by week number for ever growing salary
        ## add base salary
        for player in stats:
            base_salary = 50000 * float(week)
            pro_rated_salary = stats[player]['salary'] * float(week)
            stats[player]['salary'] = base_salary + pro_rated_salary

        # display pay
        for player in stats:
            base_pay = 50000
            pay = stats[player]['pay']
            stats[player]['pay'] = base_pay + pay

        return stats


    @app.route('/games')
    def games():
        games = []
        for game in Game.query.all():
            games.append(game.to_dict())

        return jsonify(games)


    @app.route('/games/<id>')
    def game(id):
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


# Development Server
if __name__ == '__main__':
    os.environ['APP_SETTINGS'] = 'config.DevelopmentConfig'

    app = create_app()

    if app.config.get('DEVELOPMENT'):
        with app.app_context():
            db.create_all()

    app.run(use_reloader=True)
