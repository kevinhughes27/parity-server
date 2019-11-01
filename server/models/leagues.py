class League:
    def __init__(self, zuluru_path, zuluru_id, data_folder):
        self.zuluru_path = zuluru_path
        self.zuluru_id = zuluru_id
        self.data_folder = data_folder

Leagues = [
  League('/leagues/view/league:', 702, 'data/ocua_19-20'),
  League('/leagues/view/league:', 662, 'data/ocua_18-19'),
  League('/leagues/view/league:', 647, 'data/ocua_18-19'),
  League('/leagues/view/league:', 615, 'data/ocua_17-18'),
  League('/leagues/view/league:', 596, 'data/ocua_17-18'),
  League('/divisions/view?division=', 941, 'data/ocua_16-17'),
  League('/divisions/view?division=', 940, 'data/ocua_16-17'),
]
