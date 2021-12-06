from flask_testing import TestCase as FlaskTest
from snapshottest import TestCase as SnapShotTest
from .test_base import TestBase


class StatsSnapshotTests(TestBase, FlaskTest, SnapShotTest):
    def get_stats(self):
        response = self.client.get('/api/1/stats')
        stats = response.json
        return stats


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


class APITests(TestBase, FlaskTest):
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
