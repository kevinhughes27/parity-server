from pathlib import Path
import json


def upload_game(client, data_file):
    fixture_path = Path(__file__).parent / "data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)

    response = client.post("/submit_game", json=game)
    assert response.status_code == 201


def get_stats(client):
    response = client.get("/api/1/stats")
    assert response.status_code == 200
    stats = response.json()
    return stats
