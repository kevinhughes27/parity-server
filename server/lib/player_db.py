import os, csv

class PlayerDb:
    def __init__(self, path):
        self.path = path


    def load(self, simple=False):
        # simple player db doesn't have zuluru ids
        # and only uses a name match
        self.simple = simple

        self.players_by_zid = {}
        self.players_by_name = {}

        if self.simple:
            if os.path.exists(self.path):
                with open(self.path) as csv_file:
                    csv_reader = csv.DictReader(csv_file)

                    for row in csv_reader:
                        name = row["Player's Real Name"]
                        gender = row["Gender"]

                        self.players_by_name[name] = {
                            'name': name,
                            'gender': gender
                        }
        else:
            if os.path.exists(self.path):
                with open(self.path) as csv_file:
                    csv_reader = csv.DictReader(csv_file)

                    for row in csv_reader:
                        zid = row['User ID']
                        name = row['First Name'] + " " + row["Last Name"]
                        gender = row['Roster Designation']

                        self.players_by_zid[zid] = {
                            'zuluru_id': zid,
                            'name': name,
                            'gender': gender
                        }

                        self.players_by_name[name] = {
                            'zuluru_id': zid,
                            'name': name,
                            'gender': gender
                        }

        return self


    def find_by_zuluru_id(self, zuluru_id):
        if self.simple:
            return None
        else:
            return self.players_by_zid[zuluru_id]


    def find_by_name(self, name):
        return self.players_by_name[name]
