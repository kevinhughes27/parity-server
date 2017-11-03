#!/usr/bin/env python

from app import db, create_app
from models import db, Team, Player

from bs4 import BeautifulSoup
import requests
import re
import getpass

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


def sync_team(session, id):
    soup = get_soup(session, team_path + str(id))
    team_name = soup.findAll('h2')[-1].get_text()

    team = get_or_create_team(team_name)
    sync_players(soup, team)


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



def get_or_create_team(team_name):
    instance = Team.query.filter_by(name=team_name).first()
    if instance:
        print('Found Team: ', team_name)
        return instance
    else:
        print('Creating Team: ', team_name)
        instance = Team(name=team_name)
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


if __name__ == '__main__':
    app = create_app()

    with app.app_context():
        sync_teams(league_id=596)

    db.session.remove()
