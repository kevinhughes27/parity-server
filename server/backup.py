#!/usr/bin/env python

import urllib.request, json, os
from collections import defaultdict


def backup(src_url, target_dir):
    games = fetch_games(src_url)

    game_counts = defaultdict(int)

    for game in games:
        week = str(game["week"])
        game_counts[week] += 1
        game_num = str(game_counts[week])

        file_name = "week" + week + "_game" + game_num + ".json"
        fo = open(os.path.join(target_dir, file_name), "w")
        fo.write(json.dumps(game, indent=2, sort_keys=True))
        fo.close()


def fetch_games(src_url):
    with urllib.request.urlopen(src_url) as url:
        return json.loads(url.read().decode())


if __name__ == "__main__":
    src_url = "https://parity-server.herokuapp.com/api/games"
    target_dir = "data/ocua_17-18"
    backup(src_url, target_dir)
