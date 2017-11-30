#!/usr/bin/env python

from flask_testing import TestCase
import unittest
import json
import os

from app import create_app
from models import db, Game, Player, Stats

class Test(TestCase):
    def create_app(self):
        app = create_app()
        return app

    def setUp(self):
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()

    def get_normalized_stats(self, player_name):
        player = Player.query.filter_by(name=player_name).first()

        if player:
            stats = Stats.query.filter_by(player_id=player.id).first()
            return stats.to_dict()
        else:
            fake_game_id = 0
            fake_player_id = 0
            stats = Stats(fake_game_id, fake_player_id)
            return stats.to_dict()

    def test_basic_point(self):
        with open('data/test/basic_point.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name == 'Owen Lumley':
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Sina Dee', 'Jamie Wildgen', 'Sebastien Belanger']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Jamie Wildgen', 'Sebastien Belanger', 'Michael Colantonio']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name == 'Michael Colantonio':
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name == 'Sebastien Belanger':
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name == 'Jamie Wildgen':
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Jamie Wildgen", "Sebastien Belanger", "Michael Colantonio", "Sina Dee", "Melissa Jess", "Laura Knowles"]:
                assert normalized_stats["o_points_for"] == 1
            else:
                assert normalized_stats["o_points_for"] == 0

            if player_name in ["Owen Lumley", "Kevin Barford", "Wing-Leung Chan", "Stephen Close", "Karen Kavanagh", "Heather McCabe"]:
                assert normalized_stats["d_points_against"] == 1
            else:
                assert normalized_stats["d_points_against"] == 0


    def test_callahan(self):
        with open('data/test/callahan.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name == 'Jessie Robinson':
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Brian Kells', 'Kevin Hughes(S)']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Kevin Hughes(S)', 'Ashlin Kelly']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Ashlin Kelly']:
                assert normalized_stats["throw_aways"] == 1
            else:
                assert normalized_stats["throw_aways"] == 0

            if player_name == 'Krys Kudakiewicz':
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name == 'Krys Kudakiewicz':
                assert normalized_stats["d_blocks"] == 1
            else:
                assert normalized_stats["d_blocks"] == 0

            if player_name == 'Krys Kudakiewicz':
                assert normalized_stats["callahan"] == 1
            else:
                assert normalized_stats["callahan"] == 0

            assert normalized_stats["assists"] == 0
            assert normalized_stats["second_assists"] == 0

            if player_name in ["Rob Ives", "Brent Burton", "Christopher Keates", "Krys Kudakiewicz", "Justine Price", "Jessie Robinson"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0

            if player_name in ["Brian Kells", "Benjamin Piper", "Jim Robinson", "Kevin Hughes(S)", "Ashlin Kelly", "Carrie-Anne Whyte"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0


    def test_catch_d(self):
        with open('data/test/catch_d.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name == 'Brian Kells':
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Christopher Keates', 'Patrick Kenzie', 'Brian Kells']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Patrick Kenzie', 'Kevin Barford', 'Nick Amlin']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Kevin Barford']:
                assert normalized_stats["throw_aways"] == 1
            else:
                assert normalized_stats["throw_aways"] == 0

            if player_name in ['Brian Kells']:
                assert normalized_stats["d_blocks"] == 1
            else:
                assert normalized_stats["d_blocks"] == 0

            if player_name == 'Nick Amlin':
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name == 'Brian Kells':
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            assert normalized_stats["second_assists"] == 0

            if player_name in ["Christopher Keates", "Kevin Barford", "Ryan Briggs", "Patrick Kenzie", "Kristie Ellis", "Vanessa Mann"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0

            if player_name in ["Brian Kells", "Nick Amlin", "Jonathan Champagne", "Martin Cloake", "Hannah Dawson", "Marie-Ange Gravel"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0


    def test_drop(self):
        with open('data/test/drop.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name == 'Morgan Howard':
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Patrick Kenzie', 'Morgan Howard', 'Steve Chow']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Craig Anderson', 'Steve Chow', 'Laura Chambers Storey']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Jaime Boss']:
                assert normalized_stats["drops"] == 1
            else:
                assert normalized_stats["drops"] == 0

            if player_name in ['Craig Anderson']:
                assert normalized_stats["threw_drops"] == 1
            else:
                assert normalized_stats["threw_drops"] == 0

            if player_name == 'Laura Chambers Storey':
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name == 'Steve Chow':
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name == 'Morgan Howard':
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Craig Anderson", "Graham Brown", "Patrick Kenzie", "Geofford Seaborn", "Jaime Boss", "Stacey Wowchuk"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0

            if player_name in ["Marcus Bordage", "Steve Chow", "Morgan Howard", "Jeff Hunt", "Kindha Gorman", "Laura Chambers Storey"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0


    def test_half(self):
        with open('data/test/half.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name in ['Owen Lumley', 'Frederic Caron']:
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Michael O\'Hare', 'Kevin Hughes', 'Will Leckie', 'An Tran', 'Ryan Mussell']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Kevin Hughes', 'Will Leckie', 'Andrea Proulx', 'Ryan Mussell', 'Jon Rowe']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Andrea Proulx', 'Jon Rowe']:
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name in ['Will Leckie', 'Ryan Mussell']:
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name in ['Kevin Hughes', 'An Tran']:
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Nicholas Aghajanian", "Kevin Hughes", "Will Leckie", "Michael O'Hare", "Andrea Proulx", "Megan Robb", "Ryan Mussell", "Jon Rowe", "Matthew Schijns", "David Townsend", "Karen Kavanagh", "An Tran"]:
                assert normalized_stats["o_points_for"] == 1
            else:
                assert normalized_stats["o_points_for"] == 0

            if player_name in ["Owen Lumley", "Kevin Barford", "Wing-Leung Chan", "Stephen Close", "Heather McCabe", "Darlene Riley", "Jeremy Bryan", "Frederic Caron", "Jonathan Pindur", "Jay Thor Turner", "Sandra Hanson", "Taka Yamada"]:
                assert normalized_stats["d_points_against"] == 1
            else:
                assert normalized_stats["d_points_against"] == 0


    def test_mini_game(self):
        with open('data/test/mini_game.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name in ['Brian Kells']:
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Patrick McKelvey']:
                assert normalized_stats["completions"] == 2
            elif player_name in ['Christopher Keates',
                               'Justine Price',
                               'Chris Sullivan',
                               'Jessie Robinson',
                               'Brian Kells',
                               'Scott Higgins',
                               'Tim Kealey',
                               'Benjamin Piper'
                               ]:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Christopher Keates', 'Benjamin Piper']:
                assert normalized_stats["catches"] == 2
            elif player_name in ['Justine Price',
                                 'Jessie Robinson',
                                 'Scott Higgins',
                                 'Martin Cloake',
                                 'Patrick McKelvey',
                                 'Jim Robinson'
                                 ]:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Carrie-Anne Whyte']:
                assert normalized_stats["drops"] == 1
            else:
                assert normalized_stats["drops"] == 0

            if player_name in ['Benjamin Piper']:
                assert normalized_stats["threw_drops"] == 1
            else:
                assert normalized_stats["threw_drops"] == 0

            if player_name in ['Christopher Keates']:
                assert normalized_stats["goals"] == 2
            elif player_name in ['Martin Cloake', 'Jim Robinson']:
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name in ['Justine Price', 'Jessie Robinson', 'Scott Higgins', 'Benjamin Piper']:
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name in ['Christopher Keates', 'Chris Sullivan', 'Brian Kells', 'Patrick McKelvey']:
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Brent Burton",
                               "Jason Fraser",
                               "Richard Gregory",
                               "Christopher Keates",
                               "Justine Price",
                               "Meagan Doyle",
                               "Brian Kells",
                               "Jonathan Champagne",
                               "Martin Cloake",
                               "Scott Higgins",
                               "Christine Beals",
                               "Ashlin Kelly",
                               "Tim Kealey",
                               "Patrick McKelvey",
                               "Benjamin Piper",
                               "Jim Robinson",
                               "Sam Lee",
                               "Carrie-Anne Whyte"
                               ]:
                assert normalized_stats["o_points_for"] == 1
            else:
                assert normalized_stats["o_points_for"] == 0

            if player_name in ["Brian Kells",
                               "Jonathan Champagne",
                               "Martin Cloake",
                               "Scott Higgins",
                               "Christine Beals",
                               "Ashlin Kelly",
                               "Simon Berry",
                               "Jason Fraser",
                               "Richard Gregory",
                               "Christopher Keates",
                               "Justine Price",
                               "Meagan Doyle",
                               "Rob Ives",
                               "Brent Burton",
                               "Krys Kudakiewicz",
                               "Chris Sullivan",
                               "Jessie Robinson",
                               "Michelle Warren"
                               ]:
                assert normalized_stats["d_points_against"] == 1
            else:
                assert normalized_stats["d_points_against"] == 0

            if player_name in ["Rob Ives", "Christopher Keates", "Krys Kudakiewicz", "Chris Sullivan", "Jessie Robinson", "Michelle Warren"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0

            if player_name in ["Tim Kealey", "Patrick McKelvey", "Benjamin Piper", "Jim Robinson", "Sam Lee", "Carrie-Anne Whyte"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0



    def test_mini_game2(self):
        with open('data/test/mini_game2.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name in ['Jamie Wildgen']:
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Owen Lumley', 'Kevin Barford', 'Nina Ramic', 'Kyle Sprysa', 'Thuc Nguyen']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Kevin Barford', 'Wing-Leung Chan', 'Kyle Sprysa', 'Thuc Nguyen', 'Kirsten Querbach']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Wing-Leung Chan', 'Kirsten Querbach']:
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name in ['Kevin Barford', 'Thuc Nguyen']:
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name in ['Owen Lumley', 'Kyle Sprysa']:
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Owen Lumley", "Kevin Barford", "Wing-Leung Chan", "Stephen Close", "Karen Kavanagh", "Heather McCabe", "Tyler Mulcock", "Thuc Nguyen", "Kyle Sprysa", "Rob Tyson", "Kirsten Querbach", "Nina Ramic"]:
                assert normalized_stats["o_points_for"] == 1
            else:
                assert normalized_stats["o_points_for"] == 0

            if player_name in ["Jamie Wildgen", "Sebastien Belanger", "Michael Colantonio", "Sina Dee", "Melissa Jess", "Laura Knowles", "Ryan Mussell", "Jon Rowe", "Matthew Schijns", "David Townsend", "Darlene Riley", "An Tran"]:
                assert normalized_stats["d_points_against"] == 1
            else:
                assert normalized_stats["d_points_against"] == 0


    def test_throw_away(self):
        with open('data/test/throw_away.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name in ['Michael O\'Hare']:
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Amos Lee', 'Mark Donahue', 'Kevin Hughes', 'Michael O\'Hare']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Mark Donahue', 'Greg Probe', 'Michael O\'Hare', 'Will Leckie']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Greg Probe']:
                assert normalized_stats["throw_aways"] == 1
            else:
                assert normalized_stats["throw_aways"] == 0

            if player_name in ['Will Leckie']:
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name in ['Michael O\'Hare']:
                assert normalized_stats["assists"] == 1
            else:
                assert normalized_stats["assists"] == 0

            if player_name in ['Kevin Hughes']:
                assert normalized_stats["second_assists"] == 1
            else:
                assert normalized_stats["second_assists"] == 0

            if player_name in ["Kevin Hughes", "Will Leckie", "Michael O'Hare", "Jonathan Pindur", "Megan Robb", "Taka Yamada"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0

            if player_name in ["Amos Lee", "Mark Donahue", "Greg Probe", "Trevor Stocki", "Angela Mueller", "Paula Saliba"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0


    def test_turnovers(self):
        with open('data/test/turnovers.json') as f:
            game_str = f.read()

        self.client.post('/upload', data=game_str, content_type='application/json')

        game = Game.query.filter_by(week=1).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            if player_name in ['Jamie Wildgen']:
                assert normalized_stats["pulls"] == 1
            else:
                assert normalized_stats["pulls"] == 0

            if player_name in ['Owen Lumley']:
                assert normalized_stats["completions"] == 3
            elif player_name in ['Kevin Barford', 'Sebastien Belanger']:
                assert normalized_stats["completions"] == 2
            elif player_name in ['Michael Colantonio', 'Wing-Leung Chan']:
                assert normalized_stats["completions"] == 1
            else:
                assert normalized_stats["completions"] == 0

            if player_name in ['Kevin Barford']:
                assert normalized_stats["catches"] == 3
            elif player_name in ['Wing-Leung Chan', 'Michael Colantonio']:
                assert normalized_stats["catches"] == 2
            elif player_name in ['Stephen Close', 'Sina Dee']:
                assert normalized_stats["catches"] == 1
            else:
                assert normalized_stats["catches"] == 0

            if player_name in ['Wing-Leung Chan']:
                assert normalized_stats["throw_aways"] == 3
            elif player_name in ['Sina Dee']:
                assert normalized_stats["throw_aways"] == 3
            elif player_name in ['Stephen Close']:
                assert normalized_stats["throw_aways"] == 1
            else:
                assert normalized_stats["throw_aways"] == 0

            if player_name in ['Sina Dee', 'Wing-Leung Chan']:
                assert normalized_stats["drops"] == 1
            else:
                assert normalized_stats["drops"] == 0

            if player_name in ['Michael Colantonio', 'Kevin Barford']:
                assert normalized_stats["threw_drops"] == 1
            else:
                assert normalized_stats["threw_drops"] == 0

            if player_name in ['Sebastien Belanger']:
                assert normalized_stats["goals"] == 1
            else:
                assert normalized_stats["goals"] == 0

            if player_name in ['Sebastien Belanger']:
                assert normalized_stats["callahan"] == 1
            else:
                assert normalized_stats["callahan"] == 0

            assert normalized_stats["assists"] == 0
            assert normalized_stats["second_assists"] == 0

            if player_name in ["Jamie Wildgen", "Sebastien Belanger", "Michael Colantonio", "Sina Dee", "Melissa Jess", "Laura Knowles"]:
                assert normalized_stats["d_points_for"] == 1
            else:
                assert normalized_stats["d_points_for"] == 0

            if player_name in ["Owen Lumley", "Kevin Barford", "Wing-Leung Chan", "Stephen Close", "Karen Kavanagh", "Heather McCabe"]:
                assert normalized_stats["o_points_against"] == 1
            else:
                assert normalized_stats["o_points_against"] == 0

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

if __name__ == '__main__':
    os.environ['APP_SETTINGS'] = 'config.TestingConfig'
    unittest.main()
