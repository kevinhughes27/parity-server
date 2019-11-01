class League:
    def __init__(self, zuluru_path, zuluru_id, data_root, session_folder):
        self.zuluru_path = zuluru_path
        self.zuluru_id = zuluru_id
        self.data_root = data_root

        self.player_db_path = self.data_root + '/players_db.csv'
        self.data_folder = self.data_root + '/' + session_folder

Leagues = [
  # League('/leagues/view/league:', 702, 'data/ocua_19-20', ''),
  # League('/leagues/view/league:', 662, 'data/ocua_18-19', 'session2'),
  # League('/leagues/view/league:', 647, 'data/ocua_18-19', 'session1'),
  # League('/leagues/view/league:', 615, 'data/ocua_17-18', 'session2'),
  # League('/leagues/view/league:', 596, 'data/ocua_17-18', 'session1'),
  League('/divisions/view?division=', 941, 'data/ocua_16-17', 'session2'),
  League('/divisions/view?division=', 940, 'data/ocua_16-17', 'session1'),
]
