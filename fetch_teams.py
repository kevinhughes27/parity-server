from bs4 import BeautifulSoup
import requests
import re
import getpass
from pprint import pprint

#Assumed constants
base_url = 'https://www.ocua.ca/zuluru'
login_url = 'https://www.ocua.ca/user/login'
league_path = base_url + '/divisions/view/division:'
team_path = base_url + '/teams/view/team:'
team_id_preamble = 'teams_team_'
player_id_preamble = 'people_person_'

class Team:
    def __init__(self, name, roster):
        self.name = name
        self.roster = roster
    def __repr__(self):
        return 'Team(name=%r,roster=%r)' % (self.name, self.roster)

class Player:
    def __init__(self, id, name, ismale):
        self.id = id
        self.name = name
        self.ismale = ismale
    def __repr__(self):
        return 'Player(id=%r,name=%r,ismale=%r)' % \
                (self.id, self.name, self.ismale)
    def __eq__(self, other):
        return self.id == other.id

def fetch_teams(league_id=941):
    session = login()
    team_ids = get_team_ids(session, league_id)
    teams = list(map(lambda x: build_team(session, x), team_ids))
    return teams

def get_team_ids(session,league_id):
    soup = get_soup(session, league_path + str(league_id))
    ids = [int(x.get('id').replace(team_id_preamble, '')) for x in \
           soup.findAll(id=re.compile(team_id_preamble + '\d+'))]
    return ids 

def build_team(session, id):
    soup = get_soup(session, team_path + str(id))
    team_name = soup.findAll('h2')[-1].get_text()
    #Get player info
    player_elems = soup.findAll(id=re.compile(player_id_preamble + '\d+'))
    if not player_elems:
        print('No players found. Login probably failed.')
        return Team(team_name, [])
    gender_elems = soup.findAll(text=re.compile('(Male|Female)'))
    assert(len(player_elems) == len(gender_elems))
    #Construct list of players
    team = []
    for p,g in zip(player_elems, gender_elems):
        team.append(Player(int(p.get('id').replace(player_id_preamble, '')),
                           p.get_text(),
                           g == 'Male'))
    return Team(team_name, team)

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
    r = session.post(login_url, data=login_data)
    return session

def get_soup(session, url):
    return BeautifulSoup(session.get(url).text, 'html.parser')

