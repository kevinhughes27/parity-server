from .helpers import get_stats, upload_game
from pathlib import Path
import json


def test_auth(client):
    response = client.post("/api/1/games/1")
    assert response.status_code == 401

    response = client.delete("/api/1/games/1")
    assert response.status_code == 401


def edit_game(client, league, game_id, data_file):
    fixture_path = Path(__file__).parent / "data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)

    response = client.post(
        f"/api/{league.id}/games/{game_id}", json=game, auth=("admin", "testpw")
    )
    assert response.status_code == 200, response.json()
    assert response.text == '"OK"'


def test_edit(client, league, rosters, monkeypatch, snapshot):
    upload_game(client, "mini_game.json")

    initial_stats = get_stats(client)
    assert initial_stats["stats"]["Brian Kells"]["pulls"] == 1
    assert initial_stats["stats"]["Scott Higgins"]["pulls"] == 0

    monkeypatch.setenv("PARITY_EDIT_PASSWORD", "testpw")

    game_id = 1
    edit_game(client, league, game_id, "mini_game_edited.json")

    stats = get_stats(client)
    assert stats["stats"]["Brian Kells"]["pulls"] == 0
    assert stats["stats"]["Scott Higgins"]["pulls"] == 1

    assert stats == snapshot


def test_delete(client, league, rosters, monkeypatch, snapshot):
    upload_game(client, "mini_game.json")

    initial_stats = get_stats(client)
    assert initial_stats["stats"]["Brian Kells"]["pulls"] == 1
    assert initial_stats["stats"]["Scott Higgins"]["pulls"] == 0

    monkeypatch.setenv("PARITY_EDIT_PASSWORD", "testpw")

    game_id = 1
    response = client.delete(
        f"/api/{league.id}/games/{game_id}", auth=("admin", "testpw")
    )
    assert response.status_code == 200, response.json()
    assert response.text == '"OK"'

    response = client.get("/api/1/stats")
    assert response.status_code == 200
    assert len(response.json()["stats"]) == 0
