#!/usr/bin/env python

from flask_testing import TestCase as FlaskTest
from snapshottest import TestCase as SnapShotTest
import unittest
import os

os.environ['APP_SETTINGS'] = 'config.TestingConfig'

from app import app
from models import db, Game, Player, Stats, League

class ServerTests(FlaskTest, SnapShotTest):
    def create_app(self):
        return app

    def setUp(self):
        db.create_all()
        self.init_league()

    def tearDown(self):
        db.session.remove()
        db.drop_all()

    def init_league(self):
        league = League()
        league.id = 1
        league.zuluru_id = 1
        league.name = 'Test'
        league.salary_version = 'v2'
        db.session.add(league)
        db.session.commit()

    def upload_game(self, data_file):
        with open(data_file) as f:
            game_str = f.read()

        response = self.client.post('/submit_game', data=game_str, content_type='application/json')
        assert response.status_code == 201

    def get_stats(self):
        response = self.client.get('/api/1/stats')
        stats = response.json
        return stats

    # Tests
    def test_basic_point(self):
        self.upload_game('data/test/basic_point.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_callahan(self):
        self.upload_game('data/test/callahan.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_catch_d(self):
        self.upload_game('data/test/catch_d.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_drop(self):
        self.upload_game('data/test/drop.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_half(self):
        self.upload_game('data/test/half.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_mini_game(self):
        self.upload_game('data/test/mini_game.json')

        stats = self.get_stats()
        self.assertMatchSnapshot(stats)

    def test_mini_game2(self):
        self.upload_game('data/test/mini_game2.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_throw_away(self):
        self.upload_game('data/test/throw_away.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_turnovers(self):
        self.upload_game('data/test/turnovers.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_api_endpoints(self):
        self.upload_game('data/test/mini_game2.json')

        response = self.client.get('/api/1/weeks')
        assert response.status_code == 200

        response = self.client.get('/api/1/weeks/1')
        assert response.status_code == 200

        response = self.client.get('/api/1/stats')
        assert response.status_code == 200

        response = self.client.get('/api/1/games')
        assert response.status_code == 200

        response = self.client.get('/api/1/games/1')
        assert response.status_code == 200

        response = self.client.get('/api/1/players')
        assert response.status_code == 200


if __name__ == '__main__':
    unittest.main()
