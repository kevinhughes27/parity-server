from models import Stats, Player, Team
import json


def build_stats_response(games):
    stats = {}
    stats_to_average = ['pay', 'salary_per_point', 'o_efficiency', 'd_efficiency', 'total_efficiency']

    # rollup stats per game
    for game in games:
        for player_stats in Stats.query.filter_by(game_id=game.id):
            player = Player.query.get(player_stats.player_id)
            data = player_stats.to_dict()

            # aggregate all stats for the player
            if player.name in stats:
                existing_data = stats[player.name]
                summed_stats = { s: data.get(s, 0) + existing_data.get(s, 0) for s in data.keys() }
                stats[player.name].update(summed_stats)
                stats[player.name]['games_played'] += 1
            else:
                stats.update({player.name: data})
                stats[player.name]['games_played'] = 1

            # set the team for the player
            if "(S)" in player.name:
                team = "Substitute"
            elif player.name in json.loads(game.home_roster):
                team = game.home_team
            elif player.name in json.loads(game.away_roster):
                team = game.away_team
            elif player.team_id:
                team = Team.query.get(player.team_id).name
            else:
                team = 'Unknown'

            stats[player.name].update({'team': team})

            if player.gender:
                stats[player.name].update({'gender': player.gender})

    # resolve averages
    for player in stats:
        for stat in stats_to_average:
            stats[player][stat] = stats[player][stat] / stats[player]['games_played']

        stats[player]['pay'] = round(stats[player]['pay'])
        stats[player]['salary_per_point'] = round(stats[player]['salary_per_point'])
        stats[player].pop('games_played')

    return stats
