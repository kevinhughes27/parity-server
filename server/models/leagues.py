class League:
    def __init__(self, zuluru_id, data_folder):
        self.zuluru_id = zuluru_id
        self.data_folder = data_folder

Leagues = [
  # League(702, 'data/ocua_19-20'),
  # League(662, 'data/ocua_18-19'),
  # League(647, 'data/ocua_18-19'),
  # League(615, 'data/ocua_17-18'),
  # these two didn't sync yet
  League(941, 'data/ocua_17-18'),
  League(940, 'data/ocua_16-18'),
]
