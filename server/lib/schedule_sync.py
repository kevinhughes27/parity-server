from datetime import datetime
import re
import requests
from bs4 import BeautifulSoup

class ScheduleSync:
    def __init__(self, league_id):
        self.league_id = league_id

        self.base_url = 'https://www.ocua.ca/zuluru'

        self.schedule_path = self.base_url + '/leagues/schedule'

        self.team_id_preamble = 'teams_team_'


    def load_schedule(self):
        print('Fetching schedule')

        league_params = {'league': self.league_id}
        page = requests.get(self.schedule_path, params = league_params)

        soup = BeautifulSoup(page.text, 'html.parser')

        tbody = soup.find('div', {'class': 'schedule'}).find('tbody')

        schedule = []
        #date = datetime.today().date()
        week = 0
        game_slot = 0

        for row in tbody.find_all('tr'):
            ths = row.find_all('th')
            if ths:
                #date_raw = ths[0].a['name']
                #date = datetime.strptime(date_raw, '%Y-%m-%d').date()
                week = week + 1
                game_slot = 1
            else:
                game = self.parse_game(row, week, game_slot)
                if game:
                    schedule.append(game)
                    game_slot = game_slot + 1

        return schedule


    def parse_game(self, row, week, game):
        ids = [int(x.get('id').replace(self.team_id_preamble, '')) for x in \
               row.find_all(id=re.compile(self.team_id_preamble + '\d+'))]

        if len(ids) < 2:
            return None

        return {
            'week': week,
            'game': game,
            'home_team_id': ids[0],
            'away_team_id': ids[1]
        }
