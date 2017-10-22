import urllib.request
from bs4 import BeautifulSoup
import requests
import re

base_url = 'https://www.ocua.ca/zuluru'
login_url = 'https://www.ocua.ca/user/login'

#page = urllib3.urlopen(base_page)
#soup = BeautifulSoup(page, 'html.parser')
leagueID = 941
leaguePath = base_url + '/divisions/view/division:' + str(leagueID)

class Team:
    def __init__(self, name, roster):
        self.name = name
        self.roster = roster

class Player:
    def __init__(self, id, name, ismale):
        self.id = id
        self.name = name
        self.ismale = ismale


def fetch_teams():
    team_ids = fetch_team_ids()
    
#This function works
def fetch_team_ids():
    team_id_preamble = 'teams_team_'
    page = urllib.request.urlopen(leaguePath)
    soup = BeautifulSoup(page, 'html.parser')
    ids = [x.get('id').replace(team_id_preamble, '') for x in \
           soup.findAll(id=re.compile(team_id_preamble + '\d+'))]
    assert(all(map(lambda x: x.isdigit(), ids))) 
    return ids 

#Successfully gets team name
def build_team(id):
    team_path = base_url + '/teams/view/team:' + id
    page = urllib.request.urlopen(team_path)
    soup = BeautifulSoup(page, 'html.parser')
    team_name = soup.findAll('h2')[-1].get_text()
    print(team_name)
    return soup

#Does not work
def login():
    page = urllib.request.urlopen(login_url)
    soup = BeautifulSoup(page, 'html.parser')
    form = {
        'name': 'my_username',
        'pass': 'my_password',
        'form_build_id': ,
        'form_id': 'user_login',
        'op': 'log_in'
    }
    requests.post(login_url, data=form)
    return soup

#build_team('9833')
#print(Team('Joe', [7,9]))
print(login())

