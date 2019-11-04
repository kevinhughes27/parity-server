import os, csv

class PlayerDb:
    def __init__(self, path):
        self.path = path

    # returns a Dict of players where the key is their
    # zuluru_id
    def load(self):
        players = {}

        if os.path.exists(self.path):
            with open(self.path) as csv_file:
                csv_reader = csv.DictReader(csv_file)

                for row in csv_reader:
                    players[row['User ID']] = {
                      'zuluru_id': row['User ID'],
                      'name': row['First Name'] + " " + row["Last Name"],
                      'gender': row['Roster Designation']
                    }

        return players
