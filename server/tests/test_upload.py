from .helpers import get_stats, upload_game


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
