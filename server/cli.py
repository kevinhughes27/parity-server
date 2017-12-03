#!/usr/bin/env python

import click
import requests
import urllib.request, json, glob, os, sys
from collections import defaultdict

from app import db, create_app


@click.group()
def cli():
    pass


@cli.command()
def init_db():
    click.echo('Initializing database...')

    app = create_app()

    with app.app_context():
        db.create_all()

    click.echo('Done')


@cli.command()
@click.option('--prod', is_flag=True)
def seed(prod):
    click.echo('Seeding database...')

    src = "data/ocua_17-18/"

    url = 'http://localhost:5000/upload'
    if prod:
        url = 'https://parity-server.herokuapp.com/upload'

    os.chdir(src)

    for file in glob.glob("*.json"):
        headers = {'Accept' : 'application/json', 'Content-Type' : 'application/json'}
        r = requests.post(url, data=open(file, 'rb'), headers=headers)
        print(file, r.status_code)

    click.echo('Done')


@cli.command()
def backup():
    click.echo('Downloading database...')

    src_url = "https://parity-server.herokuapp.com/api/games"
    target_dir = "data/ocua_17-18"

    game_counts = defaultdict(int)

    with urllib.request.urlopen(src_url) as url:
        games = json.loads(url.read().decode())

    for game in games:
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
