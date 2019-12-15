from datetime import datetime
import re
import requests
from bs4 import BeautifulSoup
from models import db, League, Matchup

class ScheduleSync:
    def __init__(self, league_id):
        self.league_id = league_id

        self.base_url = 'https://www.ocua.ca/zuluru'

        self.schedule_path = self.base_url + '/leagues/schedule'

        self.team_id_preamble = 'teams_team_'


    def load_schedule(self):
        print('Fetching schedule')

        league = League.query.filter_by(id=self.league_id).first()
        league_params = {'league': league.zuluru_id}
        page = requests.get(self.schedule_path, params = league_params)

        soup = BeautifulSoup(page.text, 'html.parser')

        tbody = soup.find('div', {'class': 'schedule'}).find('tbody')

        schedule = []
        date = datetime.today().date()
        week = 0
        game_slot = 0

        for row in tbody.find_all('tr'):
            ths = row.find_all('th')
            if ths:
                date_raw = ths[0].a['name']
                date = datetime.strptime(date_raw, '%Y-%m-%d').date()
                week += 1
                game_slot = 1
            else:
                matchup = self.parse_matchup(row, week, date, game_slot)
                if matchup:
                    schedule.append(matchup)
                    game_slot += 1
                else:
                    break;

        return schedule


    def parse_matchup(self, row, week, date, game_slot):
        ids = [int(x.get('id').replace(self.team_id_preamble, '')) for x in \
               row.find_all(id=re.compile(self.team_id_preamble + '\d+'))]

        if len(ids) < 2:
            return None

        matchup = Matchup()
        matchup.league_id = self.league_id
        matchup.home_team_id = ids[0]
        matchup.away_team_id = ids[1]
        matchup.week = week
        matchup.game_slot = game_slot
        matchup.date = date
        return matchup


    def update_schedule(self):
        db.session.query(Matchup).filter_by(league_id = self.league_id).delete()

        matchups = self.load_schedule()
        print (len(matchups), "games retrieved")

        for matchup in matchups:
            db.session.add(matchup)

        db.session.commit()
