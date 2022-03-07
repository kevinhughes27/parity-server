#!/usr/bin/env python

import click
import requests
import urllib.request, json, glob, sys, os, re, io, csv
from collections import defaultdict

from app import app, save_game, cache
from models import db, League, Team, Player
from lib import ZuluruSync, PlayerDb, StatsCalculator

current_league_zid = 864
current_league_id = 16
current_backup_dir = "data/ocua_21-22"


@click.group()
def cli():
    pass


@cli.command()
def init_db():
    click.echo('Initializing database...')

    with app.app_context():
        db.create_all()

    click.echo('Done')


@cli.command()
def create_leagues():
    with app.app_context():
        league_params = [
            { 'zuluru_id': 864, 'name': '2021/2022 Session 2', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 860, 'name': '2021/2022 Session 1', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 804, 'name': '2021 Session 3', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 1292, 'name': '2020/2021 Session 1', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 712, 'name': '2019/2020 Session 2', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': None, 'name': 'Parity Tournament 2020', 'stat_values': 'v2', 'salary_calc': 'sum_rate' },
            { 'zuluru_id': 702, 'name': '2019/2020 Session 1', 'stat_values': 'v2', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 662, 'name': '2018/2019 Session 2', 'stat_values': 'v1', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 647, 'name': '2018/2019 Session 1', 'stat_values': 'v1', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 615, 'name': '2017/2018 Session 2', 'stat_values': 'v1', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 596, 'name': '2017/2018 Session 1', 'stat_values': 'v1', 'salary_calc': 'pro_rate' },
            { 'zuluru_id': 941, 'name': '2016/2017 Session 2', 'stat_values': 'v1', 'salary_calc': 'sum' },
            { 'zuluru_id': 940, 'name': '2016/2017 Session 1', 'stat_values': 'v1', 'salary_calc': 'sum' },
            { 'zuluru_id': 494, 'name': '2015/2016 Winter', 'stat_values': 'v1', 'salary_calc': 'sum' },
            { 'zuluru_id': 438, 'name': '2014/2015 Winter', 'stat_values': 'v1', 'salary_calc': 'sum' },
            { 'zuluru_id': 404, 'name': '2014 Spring', 'stat_values': 'v1', 'salary_calc': 'sum' },
        ]

        league_params.reverse()

        for params in league_params:
            if League.query.filter_by(zuluru_id=params['zuluru_id']).first() != None:
                continue # skip if the league is already created in the database

            league = League()
            league.zuluru_id = params['zuluru_id']
            league.name = params['name']
            league.stat_values = params['stat_values']
            league.salary_calc = params['salary_calc']
            db.session.add(league)

        db.session.commit()
        db.session.remove()


@cli.command()
def zuluru_sync_current():
    with app.app_context():
        league = League.query.filter_by(zuluru_id=current_league_zid).first()

        zuluru_sync = ZuluruSync(league)
        zuluru_sync.sync_teams()
        zuluru_sync.sync_schedule()

        db.session.remove()

        cache.clear()


@cli.command()
def zuluru_sync_all():
    with app.app_context():

        leagues = [
            # { 'zuluru_id': 1292, 'player_db_path': ''}, # synced with current
            { 'zuluru_id': 702, 'player_db_path': 'data/ocua_19-20/players_db.csv'},
            { 'zuluru_id': 662, 'player_db_path': 'data/ocua_18-19/players_db.csv' },
            { 'zuluru_id': 647, 'player_db_path': 'data/ocua_18-19/players_db.csv' },
            { 'zuluru_id': 615, 'player_db_path': 'data/ocua_17-18/players_db.csv' },
            { 'zuluru_id': 596, 'player_db_path': 'data/ocua_17-18/players_db.csv' },
            { 'zuluru_id': 941, 'player_db_path': 'data/ocua_16-17/players_db.csv' },
            { 'zuluru_id': 940, 'player_db_path': 'data/ocua_16-17/players_db.csv' },
            { 'zuluru_id': 494, 'player_db_path': 'data/ocua_15-16/players_db.csv' },
            { 'zuluru_id': 438, 'player_db_path': 'data/ocua_14-15/players_db.csv' }
        ]

        leagues.reverse()

        is_division = [941, 940, 1292]
        simple_player_db = [494, 438, 702]

        for league in leagues:
            division = league['zuluru_id'] in is_division
            simple = league['zuluru_id'] in simple_player_db

            ZuluruSync(
                league=League.query.filter_by(zuluru_id=league['zuluru_id']).first(),
                player_db=PlayerDb(league['player_db_path']).load(simple),
                division=division
            ).sync_teams()

    db.session.remove()

    cache.clear()


@cli.command()
def game_sync():
    with app.app_context():

        db.engine.execute("TRUNCATE game CASCADE;")

        leagues = [
            { 'id': 12, 'data_folder': 'data/ocua_19-20/session2' },
            { 'id': 10, 'data_folder': 'data/ocua_19-20/session1' },
            { 'id': 9, 'data_folder': 'data/ocua_18-19/session2' },
            { 'id': 8, 'data_folder': 'data/ocua_18-19/session1' },
            { 'id': 7, 'data_folder': 'data/ocua_17-18/session2' },
            { 'id': 6, 'data_folder': 'data/ocua_17-18/session1' },
            { 'id': 5, 'data_folder': 'data/ocua_16-17/session2' },
            { 'id': 4, 'data_folder': 'data/ocua_16-17/session1' },
            { 'id': 3, 'data_folder': 'data/ocua_15-16' },
            { 'id': 2, 'data_folder': 'data/ocua_14-15' }
        ]

        leagues.reverse()

        for league in leagues:

            files = glob.glob(f"{league['data_folder']}/week*_game*.json")
            files.sort(key=lambda f: int(re.sub("[^0-9]", "", f)))

            for file in files:
                print(file)
                data = json.load(open(file))
                game = save_game(data)
                stats = StatsCalculator(game).run()

    cache.clear()
    click.echo('Done')


@cli.command()
@click.option('--week')
@click.option('--prod', default=False)
def re_upload(week, prod):
    if prod:
        url = 'https://parity-server.herokuapp.com/submit_game'
    else:
        url = 'http://localhost:5000/submit_game'

    league_folder = current_backup_dir

    files = glob.glob(f"{league_folder}/week{week}_game*.json")
    files.sort(key=lambda f: int(re.sub("[^0-9]", "", f)))

    for file in files:
        headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
        r = requests.post(url, data=open(file, 'rb'), headers=headers)
        print(file, r.status_code)

    click.echo('Done')


@cli.command()
@click.option('--week', default=0)
def backup(week):
    click.echo('Downloading games...')

    league_id = current_league_id

    src_url = f"https://parity-server.herokuapp.com/api/{league_id}/games"
    target_dir = current_backup_dir

    game_counts = defaultdict(int)

    with urllib.request.urlopen(src_url) as url:
        games = json.loads(url.read().decode())

    if week > 0:
        games = [game for game in games if game['week'] == week]

    for game in games:
        game_url = src_url + '/' + str(game['id'])

        with urllib.request.urlopen(game_url) as url:
            game = json.loads(url.read().decode())

        week = str(game["week"])
        game_counts[week] += 1
        game_num = str(game_counts[week])

        del game['id']
        del game['stats']

        file_name = "week" + week + "_game" + game_num + ".json"
        fo = open(os.path.join(target_dir, file_name), "w")
        fo.write(json.dumps(game, indent=2, sort_keys=True))
        fo.close()

    click.echo('Done')


@cli.command()
def create_parity_tournament():
    with app.app_context():
        league = League()
        league.name = "Parity Tournament 2020"
        league.stat_values = 'v2'
        league.salary_calc = 'sum'

        db.session.add(league)
        db.session.commit()

        csv_data = """Name,Gender,Team
        bob dude,male,Michelangelo
        """.replace("  ", "")

        csv_reader = csv.DictReader(io.StringIO(csv_data))

        team_names = set()
        players = []

        for row in csv_reader:
            team_names.add(row["Team"])
            players.append(row)

        teams = []
        for name in team_names:
            team = Team(league_id=league.id, name=name)
            db.session.add(team)
            db.session.commit()
            teams.append(team)

        for row in players:
            player = Player(league_id=league.id, name=row["Name"], gender=row["Gender"])
            team = [t for t in teams if t.name == row["Team"]][0]
            player.team_id = team.id
            db.session.add(player)
            db.session.commit()

    click.echo('Done')


@cli.command()
def salary_diff():
    prod_url = "https://parity-server.herokuapp.com/api/10/players"
    local_url = "http://localhost:5000/api/10/players"

    with urllib.request.urlopen(prod_url) as url:
        prod_players = json.loads(url.read().decode())

    with urllib.request.urlopen(local_url) as url:
        local_players = json.loads(url.read().decode())

    prod_salaries = { player['name']:player['salary'] for player in prod_players }
    local_salaries = { player['name']:player['salary'] for player in local_players }

    diff = {}
    for (name, salary) in prod_salaries.items():
        if local_salaries[name] != salary:
            diff[name] = f"{salary} -> {local_salaries[name]}"

    print(diff)


if __name__ == "__main__":
    cli()
