#!/usr/bin/env python

import werkzeug
werkzeug.cached_property = werkzeug.utils.cached_property

from flask_testing import TestCase as FlaskTest
from flask_testing import LiveServerTestCase
from snapshottest import TestCase as SnapShotTest

from selenium import webdriver
from urllib.request import urlopen
import unittest
import pathlib
import json
import os

os.environ['APP_SETTINGS'] = 'config.TestingConfig'

from app import app
from models import db, League


class TestBase:
    def create_app(self):
        return app


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
        fixture_path = pathlib.Path(__file__).parent / "../data/test" / data_file

        with open(fixture_path) as f:
            game_str = f.read()

        game = json.loads(game_str)
        for k in kwargs:
            if k in game:
                game[k] = kwargs[k]

        game_str = json.dumps(game)

        response = self.client.post('/submit_game', data=game_str, content_type='application/json')
        assert response.status_code == 201


class BackendTests(TestBase, FlaskTest, SnapShotTest):
    def setUp(self):
        db.create_all()
        self.init_league()

    def tearDown(self):
        db.session.remove()
        db.drop_all()

    def get_stats(self):
        response = self.client.get('/api/1/stats')
        stats = response.json
        return stats

    # Tests
    def test_basic_point(self):
        self.upload_game('basic_point.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_callahan(self):
        self.upload_game('callahan.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_catch_d(self):
        self.upload_game('catch_d.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_drop(self):
        self.upload_game('drop.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_half(self):
        self.upload_game('half.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_mini_game(self):
        self.upload_game('mini_game.json')

        stats = self.get_stats()
        self.assertMatchSnapshot(stats)

    def test_mini_game2(self):
        self.upload_game('mini_game2.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_throw_away(self):
        self.upload_game('throw_away.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_turnovers(self):
        self.upload_game('turnovers.json')
        stats = self.get_stats()
        self.assertMatchSnapshot(stats)


    def test_league_endpoint(self):
        response = self.client.get('/api/leagues')
        assert response.status_code == 200
        assert response.json == [{'id': 1, 'name': 'Test', 'zuluru_id': 1}]


    def test_api_endpoints(self):
        self.upload_game('mini_game2.json')

        response = self.client.get('/api/1/weeks')
        assert response.status_code == 200

        response = self.client.get('/api/1/weeks/1')
        assert response.status_code == 200

        response = self.client.get('/api/1/stats')
        assert response.status_code == 200

        response = self.client.get('/api/1/games')
        assert response.status_code == 200

        response = self.client.get('/api/1/games?includePoints=true')
        assert response.status_code == 200#

        response = self.client.get('/api/1/games/1')
        assert response.status_code == 200

        response = self.client.get('/api/1/players')
        assert response.status_code == 200

        response = self.client.get('/api/1/schedule')
        assert response.status_code == 200


class FrontendTests(TestBase, FlaskTest, LiveServerTestCase):
    def setUp(self):
        db.create_all()
        self.init_league(league_id=15)
        self.upload_game('mini_game.json', league_id=15)

        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(2)
        self.driver.get(self.get_server_url())

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.driver.quit()

    def test_stats(self):
        response = urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)
        assert "Parity 2.0" in self.driver.title

        player_name = "Jim Robinson"
        row = self.driver.find_element_by_xpath("//div[text()='%s']/ancestor::tr" % player_name)
        stats = row.text.split("\n")
        assert stats[2] == '1' # 1 goal

    def test_search(self):
        pass

    def test_nav(self):
        pass


if __name__ == '__main__':
    unittest.main()
