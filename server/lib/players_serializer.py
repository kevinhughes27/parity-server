from models import League


def build_players_response(session, league_id):
    league = session.get(League, league_id)
    players = [p for p in league.players if p.team_id is not None]
    stats = league.stats

    # Calculate Salaries 👍
    for player in players:
        player_stats = [s for s in stats if s.player_id == player.id]

        if len(player_stats) == 0:
            continue

        if league.salary_calc == "pro_rate":
            salaries = [ps.salary_per_point for ps in player_stats if ps.points_played > 3]
            if len(salaries) == 0:
                continue
            average_salary_per_point = sum(salaries) / len(salaries)

            pro_rated_number_of_points = 15
            pro_rated_salary = average_salary_per_point * pro_rated_number_of_points

            player.salary = round(pro_rated_salary)

        elif league.salary_calc == "sum":
            base = 500000

            earnings = [ps.pay for ps in player_stats]
            total_earnings = sum(earnings)

            player.salary = 500000 + total_earnings


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


    return [player.to_dict_with_properties() for player in players]
