import json
import pathlib


def upload_game(client, data_file, **kwargs):
    fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)
    for k in kwargs:
        if k in game:
            game[k] = kwargs[k]

    game_str = json.dumps(game)

    response = client.post(
        "/submit_game", data=game_str, content_type="application/json"
    )
    assert response.status_code == 201


def edit_game(client, data_file, **kwargs):
    fixture_path = pathlib.Path(__file__).parent / "./data" / data_file

    with open(fixture_path) as f:
        game_str = f.read()

    game = json.loads(game_str)
    for k in kwargs:
        if k in game:
            game[k] = kwargs[k]

    game_str = json.dumps(game)

    # this url is assuming game id is 1
    headers = {"Authorization": "testpw"}
    # client.environ_base['HTTP_AUTHORIZATION'] = 'testpw'
    response = client.post(
        "/api/1/games/1",
        data=game_str,
        content_type="application/json",
        headers=headers,
    )
    assert response.status_code == 200


def get_stats(client):
    response = client.get("/api/1/stats")
    stats = response.json
    return stats


def test_basic_point(client, league, snapshot):
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
    assert response.json == [{"id": 1, "name": "Test", "zuluru_id": 1}]


def test_api_endpoints(client, league, rosters, snapshot):
    upload_game(client, "mini_game.json")
    upload_game(client, "mini_game2.json")

    response = client.get("/api/1/teams")
    assert response.status_code == 200
    assert len(response.json) == 4

    response = client.get("/api/1/weeks")
    assert response.status_code == 200

    response = client.get("/api/1/weeks/1")
    assert response.status_code == 200

    response = client.get("/api/1/stats")
    assert response.status_code == 200

    response = client.get("/api/1/games")
    assert response.status_code == 200

    response = client.get("/api/1/games?includePoints=true")
    assert response.status_code == 200

    response = client.get("/api/1/games/1")
    assert response.status_code == 200

    response = client.get("/api/1/players")
    assert response.status_code == 200
    assert len(response.json) == 48

    response = client.get("/api/1/schedule")
    assert response.status_code == 200


def test_stats_edit(client, league, rosters, snapshot):
    upload_game(client, "mini_game.json")

    initial_stats = get_stats(client)
    assert initial_stats["stats"]["Brian Kells"]["pulls"] == 1
    assert initial_stats["stats"]["Scott Higgins"]["pulls"] == 0

    edit_game(client, "mini_game_edited.json")
    stats = get_stats(client)
    assert stats["stats"]["Brian Kells"]["pulls"] == 0
    assert stats["stats"]["Scott Higgins"]["pulls"] == 1

    assert stats == snapshot
