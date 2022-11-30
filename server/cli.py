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
from models import db, League, Game, Stats
from lib import StatsCalculator, ZuluruSync

current_league_zid = 906
current_league_id = 17


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
@click.option('--week')
def recalc(week):
    with app.app_context():
        games = Game.query.filter_by(league_id=current_league_id, week=week).all()
        game_ids = [game.id for game in games]

        print("Deleting old stats")
        stats = Stats.query.filter(Stats.game_id.in_(game_ids)).all()
        for stat in stats:
            db.session.delete(stat)
        db.session.commit()

        print("Re-calculating stats")
        for game in games:
            StatsCalculator(game).run()


if __name__ == "__main__":
    cli()
