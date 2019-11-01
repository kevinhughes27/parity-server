#!/usr/bin/env python

import click
import requests
import urllib.request, json, glob, sys, os, re
from collections import defaultdict
from flask_caching import Cache

from app import app
from models import db, Leagues
from lib import ZuluruSync, PlayerDb


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
def roster_sync():
    with app.app_context():
        for league in Leagues:
            player_db = PlayerDb(league.player_db_path).load()
            ZuluruSync(league=league, player_db=player_db).sync_teams()

    db.session.remove()

    cache = Cache(app, config={'CACHE_TYPE': 'simple'})
    cache.clear()


@cli.command()
def seed():
    click.echo('Seeding database...')

    url = 'http://localhost:5000/upload'
    curdir = os.getcwd()

    for league in Leagues:
        os.chdir(league.data_folder)

        files = glob.glob("week*.json")
        files.sort(key=lambda f: int(re.sub("[^0-9]", "", f)))

        for file in files:
            headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
            r = requests.post(url, data=open(file, 'rb'), headers=headers)
            print(league.data_root, file, r.status_code)

        # reset working dir
        os.chdir(curdir)

    click.echo('Done')


@cli.command()
@click.option('--week', default=0)
def backup(week):
    click.echo('Downloading database...')

    src_url = "https://parity-server.herokuapp.com/api/games"
    target_dir = "data/ocua_19-20"

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


if __name__ == "__main__":
    cli()
