from pathlib import Path
from sqlalchemy import event
import json

from server.api import CURRENT_LEAGUE_ID


def upload_game(client, data_file):
    fixture_path = Path(__file__).parent / "data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)
    game["league_id"] = CURRENT_LEAGUE_ID

    response = client.post("/submit_game", json=game)
    assert response.status_code == 201


def get_stats(client):
    response = client.get(f"/api/{CURRENT_LEAGUE_ID}/stats")
    assert response.status_code == 200
    stats = response.json()
    return stats


class QueryCounter(object):
    """Context manager to count SQLALchemy queries."""

    def __init__(self, connection):
        self.connection = connection.engine
        self.count = 0

    def __enter__(self):
        event.listen(self.connection, "before_cursor_execute", self.callback)
        return self

    def __exit__(self, *args, **kwargs):
        event.remove(self.connection, "before_cursor_execute", self.callback)

    def callback(self, *args, **kwargs):
        self.count += 1
