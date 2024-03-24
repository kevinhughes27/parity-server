#!/usr/bin/env python

import click
from app import app, cache
from config import CURRENT_LEAGUE_ID
from models import db, League, Game, Stats
from lib import StatsCalculator, ZuluruSync



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
        league = League.query.filter_by(id=CURRENT_LEAGUE_ID).first()

        zuluru_sync = ZuluruSync(league)
        zuluru_sync.sync_teams()
        zuluru_sync.sync_schedule()

        db.session.remove()

        cache.clear()


@cli.command()
@click.option('--week')
def recalc(week):
    with app.app_context():
        games = Game.query.filter_by(league_id=CURRENT_LEAGUE_ID, week=week).all()
        game_ids = [game.id for game in games]

        print("Deleting old stats")
        stats = Stats.query.filter(Stats.game_id.in_(game_ids)).all()
        for stat in stats:
            db.session.delete(stat)
        db.session.commit()

        print("Re-calculating stats")
        for game in games:
            StatsCalculator(game).run()


@cli.command()
@click.argument('game_ids', nargs=-1)
def delete_games(game_ids):
    with app.app_context():
        games = Game.query.filter(Game.id.in_(game_ids)).all()
        stats = Stats.query.filter(Stats.game_id.in_(game_ids)).all()

        for game in games:
            db.session.delete(game)

        for stat in stats:
            db.session.delete(stat)

        db.session.commit()


if __name__ == "__main__":
    cli()
