from stats_calculator import StatsCalculator
import json

def test_stats_calculator():
    game = json.loads(open("data/ocua_16-17/session2_withstats/week01_game1.json").read())
    points = game['points']

    stats = StatsCalculator(points).run()
    # assert
