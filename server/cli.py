#!/usr/bin/env python

import click
import glob
import os
import re
import json
import urllib.request
import requests
from collections import defaultdict

from app import app, cache
from models import db, League
from lib import ZuluruSync

current_league_zid = 864
current_league_id = 16


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
def zuluru_sync_current():
    with app.app_context():
        league = League.query.filter_by(zuluru_id=current_league_zid).first()

        zuluru_sync = ZuluruSync(league)
        zuluru_sync.sync_teams()
        zuluru_sync.sync_schedule()

        db.session.remove()

        cache.clear()


@cli.command()
@click.option('--week', default=0)
def backup(week):
    click.echo('Downloading games...')

    league_id = current_league_id

    src_url = f"https://parity-server.herokuapp.com/api/{league_id}/games"
    target_dir = "./tmp"

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
@click.option('--file')
def re_upload(file):
    url = 'http://localhost:5000/submit_game'

    headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
    r = requests.post(url, data=open(file, 'rb'), headers=headers)
    print(file, r.status_code)

    click.echo('Done')


if __name__ == "__main__":
    cli()
