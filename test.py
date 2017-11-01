from flask_testing import TestCase
import unittest
import json
import os

from app import db, create_app
from models import db, Game, Player, Stats
from utils import StatsCalculator

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
        normalized_stats = {}
        if player:
            stats = Stats.query.filter_by(player_id=player.id).first()
            normalized_stats["goals"] = stats.goals
            normalized_stats["assists"] = stats.assists
            normalized_stats["second_assists"] = stats.second_assists
            normalized_stats["d_blocks"] = stats.d_blocks
            normalized_stats["completions"] = stats.completions
            normalized_stats["throw_aways"] = stats.throw_aways
            normalized_stats["threw_drops"] = stats.threw_drops
            normalized_stats["catches"] = stats.catches
            normalized_stats["drops"] = stats.drops
            normalized_stats["pulls"] = stats.pulls
            normalized_stats["callahan"] = stats.callahan
            normalized_stats["o_points_for"] = stats.o_points_for
            normalized_stats["o_points_against"] = stats.o_points_against
            normalized_stats["d_points_for"] = stats.d_points_for
            normalized_stats["d_points_against"] = stats.d_points_against
        else:
            normalized_stats["goals"] = 0
            normalized_stats["assists"] = 0
            normalized_stats["second_assists"] = 0
            normalized_stats["d_blocks"] = 0
            normalized_stats["completions"] = 0
            normalized_stats["throw_aways"] = 0
            normalized_stats["threw_drops"] = 0
            normalized_stats["catches"] = 0
            normalized_stats["drops"] = 0
            normalized_stats["pulls"] = 0
            normalized_stats["callahan"] = 0
            normalized_stats["o_points_for"] = 0
            normalized_stats["o_points_against"] = 0
            normalized_stats["d_points_for"] = 0
            normalized_stats["d_points_against"] = 0

        print(player_name,
            "goals:", normalized_stats["goals"],
            "assists:", normalized_stats["assists"],
            "second_assists:", normalized_stats["second_assists"],
            "d_blocks:", normalized_stats["d_blocks"],
            "completions:", normalized_stats["completions"], 
            "throw_aways:", normalized_stats["throw_aways"],
            "threw_drops:", normalized_stats["threw_drops"],
            "catches:", normalized_stats["catches"],
            "drops", normalized_stats["drops"],
            "pulls:", normalized_stats["pulls"],
            "callahan:", normalized_stats["callahan"],
            "o_points_for:", normalized_stats["o_points_for"],
            "o_points_against:", normalized_stats["o_points_against"],
            "d_points_for:", normalized_stats["d_points_for"],
            "d_points_against:", normalized_stats["d_points_against"]
            )

        return normalized_stats


    def test_basic_point(self):
        with open('data/test/basic_point.json') as f:
            game_str = f.read()
        self.client.post('/upload', data=game_str, content_type='application/json')
        print("-------- Game: basic_point.json")

        game = Game.query.filter_by(week=0).first()
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


    def test_catch_d(self):
        with open('data/test/catch_d.json') as f:
            game_str = f.read()
        self.client.post('/upload', data=game_str, content_type='application/json')
        print("-------- Game: catch_d.json")

        game = Game.query.filter_by(week=0).first()
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
        print("-------- Game: drop.json")

        game = Game.query.filter_by(week=0).first()
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
        print("-------- Game: half.json")

        game = Game.query.filter_by(week=0).first()
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
        print("-------- Game: mini_game.json")

        game = Game.query.filter_by(week=0).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

    #        if player_name in ['Owen Lumley', 'Frederic Caron']:
    #            assert normalized_stats["pulls"] == 1
    #        else:
    #            assert normalized_stats["pulls"] == 0

    #        if player_name in ['Michael O\'Hare', 'Kevin Hughes', 'Will Leckie', 'An Tran', 'Ryan Mussell']:
    #            assert normalized_stats["completions"] == 1
    #        else:
    #            assert normalized_stats["completions"] == 0

    #        if player_name in ['Kevin Hughes', 'Will Leckie', 'Andrea Proulx', 'Ryan Mussell', 'Jon Rowe']:
    #            assert normalized_stats["catches"] == 1
    #        else:
    #            assert normalized_stats["catches"] == 0

    #        if player_name in ['Andrea Proulx', 'Jon Rowe']:
    #            assert normalized_stats["goals"] == 1
    #        else:
    #            assert normalized_stats["goals"] == 0

    #        if player_name in ['Will Leckie', 'Ryan Mussell']:
    #            assert normalized_stats["assists"] == 1
    #        else:
    #            assert normalized_stats["assists"] == 0

    #        if player_name in ['Kevin Hughes', 'An Tran']:
    #            assert normalized_stats["second_assists"] == 1
    #        else:
    #            assert normalized_stats["second_assists"] == 0

    #        if player_name in ["Nicholas Aghajanian", "Kevin Hughes", "Will Leckie", "Michael O'Hare", "Andrea Proulx", "Megan Robb", "Ryan Mussell", "Jon Rowe", "Matthew Schijns", "David Townsend", "Karen Kavanagh", "An Tran"]:
    #            assert normalized_stats["o_points_for"] == 1
    #        else:
    #            assert normalized_stats["o_points_for"] == 0
            
    #        if player_name in ["Owen Lumley", "Kevin Barford", "Wing-Leung Chan", "Stephen Close", "Heather McCabe", "Darlene Riley", "Jeremy Bryan", "Frederic Caron", "Jonathan Pindur", "Jay Thor Turner", "Sandra Hanson", "Taka Yamada"]:
    #            assert normalized_stats["d_points_against"] == 1
    #        else:
    #            assert normalized_stats["d_points_against"] == 0


    def test_mini_game2(self):
        with open('data/test/mini_game2.json') as f:
            game_str = f.read()
        self.client.post('/upload', data=game_str, content_type='application/json')
        print("-------- Game: mini_game2.json")

        game = Game.query.filter_by(week=0).first()
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
        print("-------- Game: throw_away.json")

        game = Game.query.filter_by(week=0).first()
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
        print("-------- Game: turnovers.json")

        game = Game.query.filter_by(week=0).first()
        rosters = json.loads(game.home_roster) + json.loads(game.away_roster)
        for player_name in rosters:
            normalized_stats = self.get_normalized_stats(player_name)

            #if player_name in ['Michael O\'Hare']:
            #    assert normalized_stats["pulls"] == 1
            #else:
            #    assert normalized_stats["pulls"] == 0

            #if player_name in ['Amos Lee', 'Mark Donahue', 'Kevin Hughes', 'Michael O\'Hare']:
            #    assert normalized_stats["completions"] == 1
            #else:
            #    assert normalized_stats["completions"] == 0

            #if player_name in ['Mark Donahue', 'Greg Probe', 'Michael O\'Hare', 'Will Leckie']:
            #    assert normalized_stats["catches"] == 1
            #else:
            #    assert normalized_stats["catches"] == 0

            #if player_name in ['Greg Probe']:
            #    assert normalized_stats["throw_aways"] == 1
            #else:
            #    assert normalized_stats["throw_aways"] == 0

            #if player_name in ['Will Leckie']:
            #    assert normalized_stats["goals"] == 1
            #else:
            #    assert normalized_stats["goals"] == 0

            #if player_name in ['Michael O\'Hare']:
            #    assert normalized_stats["assists"] == 1
            #else:
            #    assert normalized_stats["assists"] == 0

            #if player_name in ['Kevin Hughes']:
            #    assert normalized_stats["second_assists"] == 1
            #else:
            #    assert normalized_stats["second_assists"] == 0

            #if player_name in ["Kevin Hughes", "Will Leckie", "Michael O'Hare", "Jonathan Pindur", "Megan Robb", "Taka Yamada"]:
            #    assert normalized_stats["d_points_for"] == 1
            #else:
            #    assert normalized_stats["d_points_for"] == 0
            
            #if player_name in ["Amos Lee", "Mark Donahue", "Greg Probe", "Trevor Stocki", "Angela Mueller", "Paula Saliba"]:
            #    assert normalized_stats["o_points_against"] == 1
            #else:
            #    assert normalized_stats["o_points_against"] == 0

    # def test_stats_calculator(self):
    #     game = json.loads(open('data/ocua_17-18_test.json').read())
    #     points = json.loads(game['points'])['points']
    #     game_id = 1
    #
    #     stats = StatsCalculator(game_id, points).run()
    #     # assert


if __name__ == '__main__':
    os.environ['APP_SETTINGS'] = 'config.TestingConfig'
    unittest.main()
