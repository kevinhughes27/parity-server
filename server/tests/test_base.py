from server.app import app
from server.models import db, League
import pathlib
import json


class TestBase:
    def create_app(self):
        return app


    def setUp(self):
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
        league.salary_calc = 'pro_rate'
        db.session.add(league)
        db.session.commit()


    def upload_game(self, data_file, **kwargs):
        fixture_path = pathlib.Path(__file__).parent / "../../data/test" / data_file

        with open(fixture_path) as f:
            game_str = f.read()

        game = json.loads(game_str)
        for k in kwargs:
            if k in game:
                game[k] = kwargs[k]

        game_str = json.dumps(game)

        response = self.client.post('/submit_game', data=game_str, content_type='application/json')
        assert response.status_code == 201


    def get_stats(self):
        response = self.client.get('/api/1/stats')
        stats = response.json
        return stats
