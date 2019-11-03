from models import Team, Player

def build_teams_response(league_id):
    teams = []

    for team in Team.query.filter_by(league_id=league_id):
        players = []

        for player in Player.query.filter_by(league_id=league_id, team_id=team.id):
            players.append({
                'id': player.zuluru_id,
                'name': player.name,
                'is_male': player.is_male
            })

        teams.append({
            'id': team.zuluru_id,
            'name': team.name,
            'players': players
        })

    return teams
