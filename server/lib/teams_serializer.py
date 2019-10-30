from models import Team, Player

def build_teams_response():
    teams = []

    for team in Team.query.all():
        players = []

        for player in Player.query.filter_by(team_id=team.id):
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
