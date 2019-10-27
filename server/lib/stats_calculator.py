<<<<<<< HEAD
from models import db, Stats, Player

class StatsCalculator:
    def __init__(self, game):
        self.game = game
        self.points = game.points


    def run(self):
        self.stats = {}

        for point in self.points:
            self.process_point(point)

        for name, player_stats in self.stats.items():
            db.session.add(player_stats)

        db.session.commit()


    def process_point(self, point):
        events = point['events']
        offensePlayers = point['offensePlayers']
        defensePlayers = point['defensePlayers']

        for idx, event in enumerate(events):
            self.process_event(idx, event, events, offensePlayers, defensePlayers)


    def process_event(self, idx, event, events, offensePlayers, defensePlayers):
        if event['type'] == 'PASS':
            next_event = events[idx+1]
            if next_event['type'] != 'DROP':
                self.add_stat(event['firstActor'], 'completions')
                self.add_stat(event['secondActor'], 'catches')

        elif event['type'] == 'DROP':
            previous_event = events[idx-1]
            self.add_stat(event['firstActor'], 'drops')
            self.add_stat(previous_event['firstActor'], 'threw_drops')

        elif event['type'] == 'THROWAWAY':
            self.add_stat(event['firstActor'], 'throw_aways')

        elif event['type'] == 'DEFENSE':
            self.add_stat(event['firstActor'], 'd_blocks')

        elif event['type'] == 'POINT':
            self.add_stat(event['firstActor'], 'goals')

            # Assist and 2nd Assist
            previous_previous_event = events[idx-2]
            previous_event = events[idx-1]

            if previous_event['type'] == 'PASS' and previous_event['secondActor'] == event['firstActor']:
                self.add_stat(previous_event['firstActor'], 'assists')

                if previous_previous_event['type'] == 'PASS':
                    self.add_stat(previous_previous_event['firstActor'], 'second_assists')
            elif previous_event['type'] == 'DEFENSE' or previous_event['type'] == 'DROP':
                self.add_stat(event['firstActor'], 'callahan')

            # Finish Point
            offenseScored = event['firstActor'] in offensePlayers

            if offenseScored:
                [self.add_stat(player, 'o_points_for') for player in offensePlayers]
                [self.add_stat(player, 'd_points_against') for player in defensePlayers]
            else:
                [self.add_stat(player, 'o_points_against') for player in offensePlayers]
                [self.add_stat(player, 'd_points_for') for player in defensePlayers]

        elif event['type'] == 'PULL':
            self.add_stat(event['firstActor'], 'pulls')


    def add_stat(self, player_name, stat):
        player = self.get_or_create_player(player_name)

        if player.name not in self.stats:
            self.stats[player.name] = Stats(self.game.id, player.id)

        self.stats[player.name].count_stat(stat)


    def get_or_create_player(self, player_name):
        instance = Player.query.filter_by(name=player_name).first()

        if instance:
            return instance
        else:
            instance = Player(name=player_name)
            db.session.add(instance)
            db.session.commit()
            return instance
||||||| merged common ancestors
=======
from models import db, Stats, Player, Team

class StatsCalculator:
    def __init__(self, game):
        self.game = game
        self.points = game.points

        self.teams = Team.query.all()
        self.players = Player.query.all()

        self.verbose = False
        self.stats = {}


    def run(self):
        for idx, point in enumerate(self.points):
            if self.verbose:
                print(f"Processing point {idx}")
            self.process_point(point)

        for name, player_stats in self.stats.items():
            db.session.add(player_stats)

        db.session.commit()


    def process_point(self, point):
        events = point['events']
        offensePlayers = point['offensePlayers']
        defensePlayers = point['defensePlayers']

        for idx, event in enumerate(events):
            self.process_event(idx, event, events, offensePlayers, defensePlayers)


    def process_event(self, idx, event, events, offensePlayers, defensePlayers):
        if event['type'] == 'PASS':
            next_event = events[idx+1]
            if next_event['type'] != 'DROP':
                self.add_stat(event['firstActor'], 'completions')
                self.add_stat(event['secondActor'], 'catches')

        elif event['type'] == 'DROP':
            previous_event = events[idx-1]
            self.add_stat(event['firstActor'], 'drops')
            self.add_stat(previous_event['firstActor'], 'threw_drops')

        elif event['type'] == 'THROWAWAY':
            self.add_stat(event['firstActor'], 'throw_aways')

        elif event['type'] == 'DEFENSE':
            self.add_stat(event['firstActor'], 'd_blocks')

        elif event['type'] == 'POINT':
            self.add_stat(event['firstActor'], 'goals')

            # Assist and 2nd Assist
            previous_previous_event = events[idx-2]
            previous_event = events[idx-1]

            if previous_event['type'] == 'PASS' and previous_event['secondActor'] == event['firstActor']:
                self.add_stat(previous_event['firstActor'], 'assists')

                if previous_previous_event['type'] == 'PASS':
                    self.add_stat(previous_previous_event['firstActor'], 'second_assists')
            elif previous_event['type'] == 'DEFENSE' or previous_event['type'] == 'DROP':
                self.add_stat(event['firstActor'], 'callahan')

            # Finish Point
            offenseScored = event['firstActor'] in offensePlayers

            if offenseScored:
                [self.add_stat(player, 'o_points_for') for player in offensePlayers]
                [self.add_stat(player, 'd_points_against') for player in defensePlayers]
            else:
                [self.add_stat(player, 'o_points_against') for player in offensePlayers]
                [self.add_stat(player, 'd_points_for') for player in defensePlayers]

        elif event['type'] == 'PULL':
            self.add_stat(event['firstActor'], 'pulls')


    def add_stat(self, player_name, stat):
        player = self.find_or_create_player(player_name)

        if player.name not in self.stats:
            self.stats[player.name] = Stats(self.game.id, player.id)

        self.stats[player.name].count_stat(stat)


    def find_or_create_player(self, player_name):
        player = self.find_player(player_name)

        team = self.find_or_create_team_for_player(player_name)

        if player:
            return self.update_player(team, player)
        else:
            return self.create_player(team, player_name)


    def find_player(self, player_name):
        for player in self.players:
            if player.name == player_name:
                return player


    def create_player(self, team, player_name):
        if self.verbose:
            print(f"Creating player: '{player_name}'")

        team_id = team.id if team else None

        player = Player(team_id=team_id, name=player_name)

        db.session.add(player)
        db.session.commit()

        self.players.append(player)

        return player


    def update_player(self, team, player):
        if self.verbose:
            print(f"Updating player: '{player.name}'")

        team_id = team.id if team else None
        player.team_id = team_id
        db.session.add(player)
        return player


    def find_or_create_team_for_player(self, player_name):
        # subsitute
        if player_name.endswith("(S)"):
            return None

        # get the team the player is on
        game_team = self.game.home_team
        if player_name in self.game.away_roster:
            game_team = self.game.away_team

        team = self.find_team(game_team['id'])

        if team:
            return self.update_team(team, game_team['name'], game_team['id'])
        else:
            return self.create_team(game_team['name'], game_team['id'])


    def find_team(self, zuluru_id):
        for team in self.teams:
            if team.zuluru_id == zuluru_id:
                return team


    def create_team(self, team_name, zuluru_id):
        if self.verbose:
            print(f"Creating team: '{team_name}'")

        team = Team(name=team_name, zuluru_id=zuluru_id)

        db.session.add(team)
        db.session.commit() # need an id from this result

        self.teams.append(team)

        return team


    def update_team(self, team, team_name, zuluru_id):
        if self.verbose:
            print(f"Updating team: '{team_name}'")

        team.name = team_name
        team.zuluru_id = zuluru_id

        db.session.add(team)
        return team
>>>>>>> refactoring the stats calculator and auto-create teams on upload
