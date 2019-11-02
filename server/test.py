#!/usr/bin/env python

from flask_testing import TestCase as FlaskTest
from snapshottest import TestCase as SnapShotTest
import unittest
import os

from app import app
from models import db, Game, Player, Stats

class ServerTests(FlaskTest, SnapShotTest):

    def create_app(self):
        return app

    def setUp(self):
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()


    def upload_game(self, data_file):
        with open(data_file) as f:
            game_str = f.read()

        response = self.client.post('/submit_game', data=game_str, content_type='application/json')
        assert response.status_code == 201


    def test_basic_point(self):
        self.upload_game('data/test/basic_point.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_callahan(self):
        self.upload_game('data/test/callahan.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_catch_d(self):
        self.upload_game('data/test/catch_d.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_drop(self):
        self.upload_game('data/test/drop.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_half(self):
        self.upload_game('data/test/half.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_mini_game(self):
        self.upload_game('data/test/mini_game.json')


        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)

    def test_mini_game2(self):
        self.upload_game('data/test/mini_game2.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_throw_away(self):
        self.upload_game('data/test/throw_away.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_turnovers(self):
        self.upload_game('data/test/turnovers.json')

        response = self.client.get('/api/test/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_api_endpoints(self):
        self.upload_game('data/test/mini_game2.json')

        response = self.client.get('/api/test/weeks')
        assert response.status_code == 200

        response = self.client.get('/api/test/weeks/1')
        assert response.status_code == 200

        response = self.client.get('/api/test/stats')
        assert response.status_code == 200

        response = self.client.get('/api/test/games')
        assert response.status_code == 200

        response = self.client.get('/api/test/games/1')
        assert response.status_code == 200

        response = self.client.get('/api/test/players')
        assert response.status_code == 200


if __name__ == '__main__':
    os.environ['APP_SETTINGS'] = 'config.TestingConfig'
    unittest.main()
