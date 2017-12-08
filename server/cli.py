#!/usr/bin/env python

import click
import requests
import getpass
from bs4 import BeautifulSoup
import urllib.request, json, glob, sys, os, re
from collections import defaultdict

from app import db, create_app
from models import db, Team, Player


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


@cli.command()
def zuluru_sync():
    app = create_app()

    with app.app_context():
        sync_teams(league_id=596)

    db.session.remove()


base_url = 'https://www.ocua.ca/zuluru'
login_url = 'https://www.ocua.ca/user/login'
league_path = base_url + '/leagues/view/league:'
team_path = base_url + '/teams/view/team:'

team_id_preamble = 'teams_team_'
player_id_preamble = 'people_person_'


def sync_teams(league_id):
    session = login()

    print('Fetching Teams')
    team_ids = get_team_ids(session, league_id)

    for x in team_ids:
        sync_team(session, x)


def get_team_ids(session, league_id):
    soup = get_soup(session, league_path + str(league_id))
    ids = [int(x.get('id').replace(team_id_preamble, '')) for x in \
           soup.findAll(id=re.compile(team_id_preamble + '\d+'))]
    return ids


def sync_team(session, zuluru_id):
    soup = get_soup(session, team_path + str(zuluru_id))
    name = soup.findAll('h2')[-1].get_text()

    team = update_or_create_team(zuluru_id, name)

    reset_team_players(team)
    sync_players(soup, team)


def reset_team_players(team):
    for current_player in Player.query.filter_by(team_id=team.id):
        current_player.team_id = None
        db.session.add(current_player)

    db.session.commit()


def sync_players(soup, team):
    player_elems = soup.findAll(id=re.compile(player_id_preamble + '\d+'))

    if not player_elems:
        print('No players found. Login probably failed.')
        return

    gender_elems = soup.findAll(text=re.compile('(Male|Female)'))
    assert(len(player_elems) == len(gender_elems))

    for p,g in zip(player_elems, gender_elems):
        zuluru_id = int(p.get('id').replace(player_id_preamble, ''))
        name = p.get_text()
        gender = 'male' if g == 'Male' else 'female'
        update_or_create_player(zuluru_id, name, gender, team)


def update_or_create_team(zuluru_id, name):
    instance = Team.query.filter_by(zuluru_id=zuluru_id).first()

    if instance:
        print('Found Team: ', name)
    else:
        print('Creating Team: ', name)
        instance = Team(zuluru_id=zuluru_id)

    instance.name = name

    db.session.add(instance)
    db.session.commit()

    return instance


def update_or_create_player(zuluru_id, name, gender, team):
    instance = Player.query.filter_by(zuluru_id=zuluru_id).first()

    if instance:
        print('Found Player: ', name)
    else:
        print('Creating Player: ', name)
        instance = Player(zuluru_id=zuluru_id)

    instance.name = name
    instance.gender = gender
    instance.team_id = team.id

    db.session.add(instance)
    db.session.commit()


def login():
    print('Username:')
    username = input()
    password = getpass.getpass()

    #Extract nonce
    session = requests.Session()
    soup = get_soup(session, login_url)
    nonce = soup.find(attrs={'name':'form_build_id'}).get('value')

    # Authenticate
    login_data = {
        'name':  username,
        'pass':  password,
        'form_build_id': nonce,
        'form_id': 'user_login',
        'op': 'log_in'
    }

    print('Logging in')
    r = session.post(login_url, data=login_data)
    return session

def get_soup(session, url):
    return BeautifulSoup(session.get(url).text, 'html.parser')


if __name__ == "__main__":
    cli()
