from app import app
from models import db, League, Team, Player
import pathlib
import json
import os


class TestBase:
    def create_app(self):
        os.environ["PARITY_EDIT_PASSWORD"] = "testpw"
        return app

    def setUp(self):
        db.drop_all()
        db.create_all()
        self.init_league()

    def tearDown(self):
        db.session.remove()
        db.drop_all()

    def init_league(self, **kwargs):
        league = League()
        league.id = kwargs.get("league_id", 1)
        league.zuluru_id = 1
        league.name = 'Test'
        league.stat_values = 'v2'
        league.salary_calc = 'sum'
        db.session.add(league)
        db.session.commit()

    # valid for mini_games
    # players get created during stat upload but don't get teams
    # players only get teams when created through a zuluru sync
    # otherwise subsitutes etc would change rosters
    def create_rosters(self, league_id=1):
        fixture_path = pathlib.Path(__file__).parent / "./data/rosters.json"

        with open(fixture_path) as f:
            rosters_str = f.read()

        rosters = json.loads(rosters_str)

        for idx, team in enumerate(rosters):
            t = Team(league_id=league_id, zuluru_id=idx, name=team)
            db.session.add(t)
            db.session.commit()
            players = rosters[team]
            for p in players:
                db.session.add(Player(league_id=league_id, name=p, team_id=t.id))
            db.session.commit()

    def upload_game(self, data_file, **kwargs):
        fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

        with open(fixture_path) as f:
            game_str = f.read()

        game = json.loads(game_str)
        for k in kwargs:
            if k in game:
                game[k] = kwargs[k]

        game_str = json.dumps(game)

        response = self.client.post('/submit_game', data=game_str, content_type='application/json')
        assert response.status_code == 201

    def edit_game(self, data_file, **kwargs):
        fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

        with open(fixture_path) as f:
            game_str = f.read()

        game = json.loads(game_str)
        for k in kwargs:
            if k in game:
                game[k] = kwargs[k]

        game_str = json.dumps(game)

        # this url is assuming game id is 1
        headers = {'Authorization': 'testpw'}
        # self.client.environ_base['HTTP_AUTHORIZATION'] = 'testpw'
        response = self.client.post('/api/1/games/1', data=game_str, content_type='application/json', headers=headers)
        assert response.status_code == 200

    def get_stats(self):
        response = self.client.get('/api/1/stats')
        stats = response.json
        return stats
