#!/usr/bin/env python

import click
import urllib.request, json, glob, sys, os, re
from collections import defaultdict
from flask_caching import Cache

from app import app
from models import db, Leagues
from lib import ZuluruSync, PlayerDb

data_folder = "data/ocua_18-19/session2"

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
@click.option('--prod', is_flag=True)
@click.option('--week', default=0)
def seed(prod, week):
    click.echo('Seeding database...')

    url = 'https://parity-server.herokuapp.com/upload' if prod else 'http://localhost:5000/upload'

    src = data_folder
    os.chdir(src)

    pattern = "week{:d}*.json".format(week) if week > 0 else "*.json"

    files = glob.glob(pattern)
    files.sort(key=lambda f: int(re.sub("[^0-9]", "", f)))

    for file in files:
        headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
        r = requests.post(url, data=open(file, 'rb'), headers=headers)
        print(file, r.status_code)

    click.echo('Done')


@cli.command()
@click.option('--week', default=0)
def backup(week):
    click.echo('Downloading database...')

    src_url = "https://parity-server.herokuapp.com/api/games"
    target_dir = data_folder

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

        file_name = "week" + week + "_game" + game_num + ".json"
        fo = open(os.path.join(target_dir, file_name), "w")
        fo.write(json.dumps(game, indent=2, sort_keys=True))
        fo.close()

    click.echo('Done')


@cli.command()
def roster_sync():
    with app.app_context():
        for league in Leagues:
            player_db = PlayerDb(league.data_folder + "/players_db.csv").load()
            ZuluruSync(league=league, player_db=player_db).sync_teams()

    db.session.remove()

    cache = Cache(app, config={'CACHE_TYPE': 'simple'})
    cache.clear()


if __name__ == "__main__":
    cli()
