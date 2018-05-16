#!/usr/bin/env python

from flask_testing import TestCase as FlaskTest
from snapshottest import TestCase as SnapShotTest
import unittest
import json
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


    def test_basic_point(self):
        with open('data/test/basic_point.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_callahan(self):
        with open('data/test/callahan.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_catch_d(self):
        with open('data/test/catch_d.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_drop(self):
        with open('data/test/drop.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_half(self):
        with open('data/test/half.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_mini_game(self):
        with open('data/test/mini_game.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_mini_game2(self):
        with open('data/test/mini_game2.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_throw_away(self):
        with open('data/test/throw_away.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)


    def test_turnovers(self):
        with open('data/test/turnovers.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/stats')
        stats = response.json

        self.assertMatchSnapshot(stats)

    def test_calc_endpoint(self):
        with open('data/test/basic_point.json') as f:
            game_str = f.read()

        response = self.client.post('/calc', data=game_str, content_type='application/json')

        rows = str(response.data).split("\\n")[1:]
        sortedlist = sorted(rows, key=lambda row: row.split(",")[0])

        self.assertMatchSnapshot(sortedlist)

    def test_api_endpoints(self):
        with open('data/test/mini_game2.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        response = self.client.get('/api/weeks')
        assert response.status_code == 200

        response = self.client.get('/api/weeks/1')
        assert response.status_code == 200

        response = self.client.get('/api/stats')
        assert response.status_code == 200

        response = self.client.get('/api/games')
        assert response.status_code == 200

        response = self.client.get('/api/games/1')
        assert response.status_code == 200

        response = self.client.get('/api/players')
        assert response.status_code == 200


if __name__ == '__main__':
    os.environ['APP_SETTINGS'] = 'config.TestingConfig'
    unittest.main()
