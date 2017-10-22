from ..models.stats import Stats
from ..models.player import Player

class StatsCalculator:
    def __init__(self, points):
        self.points = points
        self.stats = []

    def run(self):
        for point in self.points:
            events = point['events']
            offensePlayers = point['offensePlayers']
            defensePlayers = point['defensePlayers']

            for event in events:
                if event['type'] == "POINT":
                    offenseScored = event['firstActor'] in offensePlayers
                    if offenseScored:
                        self.add_stat(player, 'OPointsFor', 1) for player in offensePlayers
                        self.add_stat(player, 'DPointsAgainst', 1) for player in defensePlayers
                    else:
                        self.add_stat(player, 'OPointsAgainst', 1) for player in offensePlayers
                        self.add_stat(player, 'DPointsFor', 1) for player in defensePlayers

    def add_stat(self, stat):
        # is player in stats by name?
        # otherwise add them to stats array
        # update their stats
        pass
