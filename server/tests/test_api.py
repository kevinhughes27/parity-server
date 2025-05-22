import json
import pathlib
import time


def upload_game(client, data_file):
    fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)

    response = client.post("/submit_game", json=game)
    assert response.status_code == 201


def edit_game(client, data_file):
    fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)

    # this url is assuming game id is 1
    response = client.post("/api/1/games/1", json=game, auth=("admin", "testpw"))
    assert response.status_code == 200, response.json()


def get_stats(client):
    response = client.get("/api/1/stats")
    stats = response.json()
    return stats


def test_basic_point(client, league, rosters, snapshot):
    upload_game(client, "basic_point.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_callahan(client, league, snapshot):
    upload_game(client, "callahan.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_catch_d(client, league, snapshot):
    upload_game(client, "catch_d.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_drop(client, league, snapshot):
    upload_game(client, "drop.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_half(client, league, snapshot):
    upload_game(client, "half.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_mini_game(client, league, snapshot):
    upload_game(client, "mini_game.json")

    stats = get_stats(client)
    assert stats == snapshot


def test_mini_game2(client, league, snapshot):
    upload_game(client, "mini_game2.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_throw_away(client, league, snapshot):
    upload_game(client, "throw_away.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_turnovers(client, league, snapshot):
    upload_game(client, "turnovers.json")
    stats = get_stats(client)
    assert stats == snapshot


def test_league_endpoint(client, league, snapshot):
    response = client.get("/api/leagues")
    assert response.status_code == 200
    assert response.json() == [{"id": 1, "name": "Test", "zuluruId": 1}]


def test_api_endpoints(client, league, rosters, snapshot):
    upload_game(client, "mini_game.json")
    upload_game(client, "mini_game2.json")

    response = client.get("/api/1/teams")
    assert response.status_code == 200
    assert len(response.json()) == 4

    response = client.get("/api/1/weeks")
    assert response.status_code == 200

    response = client.get("/api/1/weeks/1")
    assert response.status_code == 200

    response = client.get("/api/1/stats")
    assert response.status_code == 200

    response = client.get("/api/1/games")
    assert response.status_code == 200

    # this param does not exist yet
    response = client.get("/api/1/games?includePoints=true")
    assert response.status_code == 200

    response = client.get("/api/1/games/1")
    assert response.status_code == 200

    response = client.get("/api/1/players")
    assert response.status_code == 200
    assert len(response.json()) == 48

    response = client.get("/api/1/schedule")
    assert response.status_code == 200


def test_stats_edit(client, league, rosters, monkeypatch, snapshot):
    upload_game(client, "mini_game.json")

    initial_stats = get_stats(client)
    assert initial_stats["stats"]["Brian Kells"]["pulls"] == 1
    assert initial_stats["stats"]["Scott Higgins"]["pulls"] == 0

    monkeypatch.setenv("PARITY_EDIT_PASSWORD", "testpw")

    edit_game(client, "mini_game_edited.json")

    # hack to wait for cache clear
    time.sleep(1)

    stats = get_stats(client)
    assert stats["stats"]["Brian Kells"]["pulls"] == 0
    assert stats["stats"]["Scott Higgins"]["pulls"] == 1

    assert stats == snapshot
