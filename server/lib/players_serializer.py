from models import Player, Stats, League

def build_players_response(league_id):
    league = League.query.filter_by(id=league_id).first()
    players = Player.query.filter(Player.league_id == league_id, Player.team_id != None).all()
    stats = Stats.query.filter_by(league_id=league_id).all()

    # Calculate Salaries 👍
    for player in players:
        player_stats = [s for s in stats if s.player_id == player.id]

        if len(player_stats) == 0:
            continue

        if league.salary_calc == "pro_rate":
            salaries = [ps.salary_per_point for ps in player_stats if ps.points_played > 3]
            average_salary_per_point = sum(salaries) / len(salaries)

            pro_rated_number_of_points = 15
            pro_rated_salary = average_salary_per_point * pro_rated_number_of_points

            player.salary = round(pro_rated_salary)

        elif league.salary_calc == "sum":
            earnings = [ps.pay for ps in player_stats]
            total_earnings = sum(earnings)

            player.salary = total_earnings


    # Estimate Salaries 👎
    male_salaries = [p.salary for p in players if p.is_male and p.salary]
    female_salaries = [p.salary for p in players if not p.is_male and p.salary]

    avg_male_salary = round(sum(male_salaries) / (len(male_salaries) or 1))
    avg_female_salary = round(sum(female_salaries) / (len(female_salaries) or 1))

    for player in players:
        if player.salary == None:
            if player.fallback_salary:
                player.salary = player.fallback_salary
            elif player.is_male:
                player.salary = avg_male_salary
            else:
                player.salary = avg_female_salary


    return [player.to_dict() for player in players]
