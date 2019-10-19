from models import db, Stats, Player

class StatsCalculator:
    def __init__(self, league, game_id, points):
        self.league = league
        self.game_id = game_id
        self.points = points
        self.stats = {}

    def run(self):
        for point in self.points:
            self.process_point(point)

        return self.stats.items()

    def process_point(self, point):
        events = point['events']
        offensePlayers = point['offensePlayers']
        defensePlayers = point['defensePlayers']

        for idx, event in enumerate(events):
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
            self.stats[player.name] = Stats(self.league, self.game_id, player.id)

        self.stats[player.name].count_stat(stat)

    #TODO the create portion of this can be removed after we get scraping working
    def get_or_create_player(self, player_name):
        instance = Player.query.filter_by(name=player_name, league=self.league).first()
        if instance:
            return instance
        else:
            instance = Player(name=player_name, league=self.league)
            db.session.add(instance)
            db.session.commit()
            return instance
