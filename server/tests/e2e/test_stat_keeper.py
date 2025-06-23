from playwright.sync_api import Browser, Page, expect
import pytest
import re
import requests
import time
import numpy as np

from server.api import CURRENT_LEAGUE_ID

# use `page.pause()` with `--headed` to pause and
# start the recorder. Then use the UI to make drive the test
# before copying the code back. select pytest for export


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, playwright):
    return {"viewport": {"width": 768, "height": 900}, "is_mobile": True}


# base_url = "http://localhost:8000"
base_url = "http://localhost:5173"


def start_stats_keeper(page: Page):
    page.goto(f"{base_url}/stat_keeper")

    blank_slate = 'No games stored locally. Click "Start New Game" to begin.'
    expect(page.get_by_role("paragraph")).to_contain_text(blank_slate)

    page.get_by_role("button", name="Start New Game").click()
    expect(page.locator("h5")).to_contain_text("New Game")


def select_teams(page: Page, home: str, away: str):
    # initial state
    expect(page.locator("h5")).to_contain_text("New Game")
    expect(page.locator("#root")).to_contain_text("Select Home Team to edit roster.")
    expect(page.locator("#root")).to_contain_text("Select Away Team to edit roster.")

    # select teams
    page.get_by_role("combobox", name="Home Team").click()
    page.get_by_role("option", name=home).click()

    page.get_by_role("combobox", name="Away Team").click()
    page.get_by_role("option", name=away).click()


def expect_rosters(page: Page, home_players: list[str], away_players: list[str]):
    # rosters visible
    # checks that all player names are visible but does not check inside a specific container
    # so this assumes the rosters are distinct sets (which they should be)
    # technically they don't have to be distinct and things would work but that is confusing in tests
    # I could add a reasonable ID here to fix this.
    for player in home_players:
        expect(page.locator("#root")).to_contain_text(player)
    for player in away_players:
        expect(page.locator("#root")).to_contain_text(player)

    # roster editing now visible
    expect(
        page.get_by_role("heading", name="Add Player from League").first
    ).to_be_visible()
    expect(
        page.get_by_role("heading", name="Add Custom Substitute").first
    ).to_be_visible()


def start_game(page: Page):
    page.get_by_role("button", name="Start").click()


def start_point(page: Page):
    page.get_by_role("button", name="Start Point").click()


def select_lines(page: Page, home_line: list[str], away_line: list[str]):
    for player in home_line:
        page.get_by_role("button", name=player).click()
    for player in away_line:
        page.get_by_role("button", name=player).click()


def expect_players_selected(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).to_contain_class("MuiButton-colorPrimary")


def expect_players_not_selected(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).not_to_contain_class("MuiButton-colorPrimary")


def expect_lines_selected(page: Page, home: str, away: str):
    expect(page.locator("#root")).to_contain_text(f"{home} (6/6)")
    expect(page.locator("#root")).to_contain_text(f"{away} (6/6)")


def expect_players_enabled(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).to_be_enabled()


def expect_players_disabled(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).to_be_disabled()


def expect_next_line_text(page: Page):
    message1 = "Players not on the previous line are pre-selected."
    message2 = "Adjust and confirm.If a point was just scored, 'Undo Last Action' will revert the score and take you back to editing the last event of that point."
    expect(page.locator("#root")).to_contain_text(f"{message1} {message2}")


def open_hamburger_menu(page: Page):
    page.get_by_role("button").filter(has_text=re.compile(r"^$")).click()


def submit_game(page: Page, *, failed: bool = False):
    open_hamburger_menu(page)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("menuitem", name="Submit Game").click()

    page.wait_for_url("**/stat_keeper")
    expect(page.locator("#root")).to_contain_text("Local Games")

    if failed:
        expect(page.locator("#root")).to_contain_text("sync-error")
    else:
        expect(page.locator("#root")).to_contain_text("uploaded")


def get_stats():
    resp = requests.get(f"http://localhost:8000/api/{CURRENT_LEAGUE_ID}/stats")
    return resp.json()["stats"]


def get_game(id: int):
    resp = requests.get(f"http://localhost:8000/api/{CURRENT_LEAGUE_ID}/games/{id}")
    return resp.json()


def test_basic_point(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = [
        "Brian Kells",
        "Jonathan Champagne",
        "Martin Cloake",
        "Scott Higgins",
        "Christine Beals",
        "Ashlin Kelly",
    ]
    away_line = [
        "Owen Lumley",
        "Kevin Barford",
        "Wing-Leung Chan",
        "Stephen Close",
        "Karen Kavanagh",
        "Heather McCabe",
    ]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # initial state (both lines enabled)
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # players who are off
    home_bench = [p for p in rosters[home] if p not in home_line]
    away_bench = [p for p in rosters[away] if p not in away_line]
    expect_players_disabled(page, home_bench)
    expect_players_disabled(page, away_bench)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe passed to Kevin Barford",
            "4.Kevin Barford scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)

    # lines are swapped automatically
    expect_next_line_text(page)
    expect_players_not_selected(page, home_line)
    expect_players_not_selected(page, away_line)
    expect_players_selected(page, home_bench)
    expect_players_selected(page, away_bench)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()
    assert stats["Brian Kells"]["pulls"] == 1
    assert stats["Heather McCabe"]["assists"] == 1
    assert stats["Kevin Barford"]["goals"] == 1


def test_turnovers(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()

    # pre turnover state
    expect_players_disabled(page, home_line)
    expect_players_enabled(
        page, [p for p in away_line if p != "Heather McCabe"]
    )  # player with the disk is enabled

    # button state
    expect(page.get_by_role("button", name="Throwaway")).to_be_enabled()
    expect(page.get_by_role("button", name="Drop")).to_be_enabled()
    expect(page.get_by_role("button", name="D (Block)")).to_be_disabled()
    expect(page.get_by_role("button", name="Catch D")).to_be_disabled()

    # record throwaway (no D)
    page.get_by_role("button", name="Throwaway").click()

    # other team is enabled now
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    # select who picked up the disc to complete
    page.get_by_role("button", name="Brian Kells").click()

    # D buttons become enabled
    expect(page.get_by_role("button", name="D (Block)")).to_be_enabled()
    expect(page.get_by_role("button", name="Catch D")).to_be_enabled()

    # continue with a pass for a pure throw_away
    page.get_by_role("button", name="Scott Higgins").click()  # Pass

    # D buttons disabled again
    expect(page.get_by_role("button", name="D (Block)")).to_be_disabled()
    expect(page.get_by_role("button", name="Catch D")).to_be_disabled()

    # record D (throwaway -> defender -> D)
    page.get_by_role("button", name="Throwaway").click()
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, away_line)
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="D (Block)").click()

    # select who picked up the disc to continue
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()  # Pass

    # record catch D (throwaway -> defender -> Catch D)
    page.get_by_role("button", name="Throwaway").click()
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)
    page.get_by_role("button", name="Ashlin Kelly").click()
    page.get_by_role("button", name="Catch D").click()

    # defender already has the disk
    expect(page.get_by_role("button", name="Ashlin Kelly")).to_be_disabled()
    page.get_by_role("button", name="Scott Higgins").click()  # Pass
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe threw it away",
            "4.Brian Kells passed to Scott Higgins",
            "5.Scott Higgins threw it away",
            "6.Owen Lumley got a block",
            "7.Owen Lumley passed to Heather McCabe",
            "8.Heather McCabe threw it away",
            "9.Ashlin Kelly got a block",
            "10.Ashlin Kelly passed to Scott Higgins",
            "11.Scott Higgins scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    # throw_aways
    assert stats["Heather McCabe"]["throw_aways"] == 2
    assert stats["Heather McCabe"]["catches"] == 2
    assert stats["Heather McCabe"]["o_points_against"] == 1

    assert stats["Scott Higgins"]["throw_aways"] == 1
    assert stats["Scott Higgins"]["goals"] == 1
    assert stats["Scott Higgins"]["d_points_for"] == 1

    # d block
    assert stats["Owen Lumley"]["d_blocks"] == 1
    assert stats["Owen Lumley"]["catches"] == 0
    assert stats["Owen Lumley"]["o_points_against"] == 1

    # catch d
    assert stats["Ashlin Kelly"]["d_blocks"] == 1
    assert stats["Ashlin Kelly"]["catches"] == 0
    assert stats["Ashlin Kelly"]["d_points_for"] == 1


def test_drop(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Drop").click()

    # possession flips
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Ashlin Kelly").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe dropped it",
            "4.Brian Kells passed to Ashlin Kelly",
            "5.Ashlin Kelly scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    assert stats["Owen Lumley"]["threw_drops"] == 1
    assert stats["Owen Lumley"]["o_points_against"] == 1
    assert stats["Heather McCabe"]["drops"] == 1
    assert stats["Heather McCabe"]["o_points_against"] == 1
    assert stats["Ashlin Kelly"]["d_points_for"] == 1


def test_callahan(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Throwaway").click()
    page.get_by_role("button", name="Ashlin Kelly").click()
    page.get_by_role("button", name="Catch D").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley threw it away",
            "3.Ashlin Kelly got a block",
            "4.Ashlin Kelly scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    assert stats["Owen Lumley"]["throw_aways"] == 1
    assert stats["Owen Lumley"]["assists"] == 0
    assert stats["Owen Lumley"]["o_points_against"] == 1

    assert stats["Ashlin Kelly"]["goals"] == 1
    assert stats["Ashlin Kelly"]["callahan"] == 1
    assert stats["Ashlin Kelly"]["d_points_for"] == 1


def test_undo(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()

    # check possession
    expect(page.get_by_role("button", name="Owen Lumley")).to_be_enabled()
    expect(page.get_by_role("button", name="Heather McCabe")).to_be_disabled()

    # undo pass
    page.get_by_role("button", name="Undo").click()

    # possesion moves back
    expect(page.get_by_role("button", name="Owen Lumley")).to_be_disabled()
    expect(page.get_by_role("button", name="Heather McCabe")).to_be_enabled()

    # new pass
    page.get_by_role("button", name="Kevin Barford").click()
    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Kevin Barford",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)

    # throw away undo
    page.get_by_role("button", name="Throwaway").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford threw it away")
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).not_to_contain_text("Kevin Barford threw it away")

    # drop undo
    page.get_by_role("button", name="Drop").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford dropped it")
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).not_to_contain_text("Kevin Barford dropped it")

    # d undo
    page.get_by_role("button", name="Throwaway").click()
    page.get_by_role("button", name="Scott Higgins").click()
    page.get_by_role("button", name="D (Block)").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford threw it away")
    expect(page.get_by_role("list")).to_contain_text("Scott Higgins got a block")
    expect(
        page.get_by_role("button", name="Scott Higgins")
    ).to_be_enabled()  # not a catch d so no one has possession
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford threw it away")
    expect(page.get_by_role("list")).not_to_contain_text("Scott Higgins got a block")
    # undo possession
    expect(page.get_by_role("button", name="Scott Higgins")).to_be_disabled()
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("button", name="Scott Higgins")).to_be_enabled()
    # undo throw away
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).not_to_contain_text("Kevin Barford threw it away")

    # catch d undo
    page.get_by_role("button", name="Throwaway").click()
    page.get_by_role("button", name="Scott Higgins").click()
    page.get_by_role("button", name="Catch D").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford threw it away")
    expect(page.get_by_role("list")).to_contain_text("Scott Higgins got a block")
    expect(
        page.get_by_role("button", name="Scott Higgins")
    ).to_be_disabled()  # catch d so he has possession
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford threw it away")
    expect(page.get_by_role("list")).not_to_contain_text("Scott Higgins got a block")
    # undo possession
    expect(page.get_by_role("button", name="Scott Higgins")).to_be_disabled()
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("button", name="Scott Higgins")).to_be_enabled()
    # undo throw away
    page.get_by_role("button", name="Undo").click()
    expect(page.get_by_role("list")).not_to_contain_text("Kevin Barford threw it away")

    # undo point
    page.get_by_role("button", name="Point!").click()
    expect(page.get_by_role("list")).to_contain_text("Kevin Barford scored!")
    page.get_by_role("button", name="Undo Last").click()
    expect(page.get_by_role("list")).not_to_contain_text("Kevin Barford scored!")

    # finish point
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Point!").click()

    page.get_by_role("button", name="Kevin Barford").click()
    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Kevin Barford",
            "3.Kevin Barford passed to Owen Lumley",
            "4.Owen Lumley scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # start second point
    start_point(page)

    # undo callahan
    page.get_by_role("button", name="Christopher Keates").click()
    page.get_by_role("button", name="Throwaway").click()
    page.get_by_role("button", name="Kyle Sprysa").click()
    page.get_by_role("button", name="Catch D").click()
    page.get_by_role("button", name="Point!").click()
    page.get_by_role("button", name="Undo Last Action").click()
    page.get_by_role("button", name="Kirsten Querbach").click()
    page.get_by_role("button", name="Point!").click()

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    assert stats["Owen Lumley"]["goals"] == 1

    assert stats["Kevin Barford"]["goals"] == 0
    assert stats["Kevin Barford"]["throw_aways"] == 0
    assert stats["Kevin Barford"]["drops"] == 0
    assert stats["Kevin Barford"]["completions"] == 1
    assert stats["Kevin Barford"]["assists"] == 1

    assert stats["Scott Higgins"]["d_blocks"] == 0

    assert stats["Kyle Sprysa"]["goals"] == 0
    assert stats["Kyle Sprysa"]["callahan"] == 0

    assert stats["Kirsten Querbach"]["goals"] == 1


def test_button_states(server, league, rosters, page: Page) -> None:
    # coverage for this logic is sprinkled around in other tests as well
    # it is still nice to have one test explicitly focusing on this
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")

    # all player buttons enabled
    expect_players_enabled(page, rosters[home])
    expect_players_enabled(page, rosters[away])

    home_line = rosters[home][:6]
    home_bench = rosters[home][6:]
    away_line = rosters[away][:6]
    away_bench = rosters[away][6:]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # lines active, bench disabled
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)
    expect_players_disabled(page, home_bench)
    expect_players_disabled(page, away_bench)

    # all actions disabled until a player is picked to start
    expect(page.get_by_role("button", name="Pull")).to_be_disabled()
    expect(page.get_by_role("button", name="Point!")).to_be_disabled()
    expect(page.get_by_role("button", name="Drop")).to_be_disabled()
    expect(page.get_by_role("button", name="Throwaway")).to_be_disabled()
    expect(page.get_by_role("button", name="D (Block)")).to_be_disabled()
    expect(page.get_by_role("button", name="Catch D")).to_be_disabled()
    expect(
        page.get_by_role("button", name="Undo")
    ).to_be_disabled()  # nothing has happened yet

    # player is chosen
    # away is pulling
    page.get_by_role("button", name="Owen Lumley").click()
    expect_players_disabled(page, home_line)
    expect_players_disabled(page, away_line)
    expect(page.get_by_role("button", name="Pull")).to_be_enabled()
    expect(page.get_by_role("button", name="Point!")).to_be_disabled()
    expect(page.get_by_role("button", name="Drop")).to_be_disabled()
    expect(page.get_by_role("button", name="Throwaway")).to_be_disabled()
    expect(page.get_by_role("button", name="D (Block)")).to_be_disabled()
    expect(page.get_by_role("button", name="Catch D")).to_be_disabled()
    expect(page.get_by_role("button", name="Undo")).to_be_enabled()

    # Pull has to be next (or undo)
    page.get_by_role("button", name="Pull").click()
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_disabled()
    expect(page.get_by_role("button", name="drop")).to_be_disabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_disabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_disabled()
    expect(page.get_by_role("button", name="catch d")).to_be_disabled()

    # player receives the pull or picks it up
    page.get_by_role("button", name="Brian Kells").click()
    expect_players_enabled(page, [p for p in home_line if p != "Brian Kells"])
    expect_players_disabled(page, away_line)
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_disabled()
    expect(page.get_by_role("button", name="drop")).to_be_enabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_enabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_disabled()
    expect(page.get_by_role("button", name="catch d")).to_be_disabled()

    # pass
    page.get_by_role("button", name="Ashlin Kelly").click()
    expect_players_enabled(page, [p for p in home_line if p != "Ashlin Kelly"])
    expect_players_disabled(page, away_line)
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_enabled()
    expect(page.get_by_role("button", name="drop")).to_be_enabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_enabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_disabled()
    expect(page.get_by_role("button", name="catch d")).to_be_disabled()

    # turnover
    page.get_by_role("button", name="Throwaway").click()
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, away_line)
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_disabled()
    expect(page.get_by_role("button", name="drop")).to_be_disabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_disabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_disabled()
    expect(page.get_by_role("button", name="catch d")).to_be_disabled()

    # player is selected next then a D or Catch D can be recorded or not for a pick up
    page.get_by_role("button", name="Owen Lumley").click()
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, [p for p in away_line if p != "Owen Lumley"])
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_disabled()
    expect(
        page.get_by_role("button", name="drop")
    ).to_be_enabled()  # ToDo the player who picks it up should not be able to drop it
    expect(page.get_by_role("button", name="throwaway")).to_be_enabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_enabled()
    expect(page.get_by_role("button", name="catch d")).to_be_enabled()

    # pass (d buttons get disabled now)
    page.get_by_role("button", name="Heather McCabe").click()
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="point!")).to_be_enabled()
    expect(page.get_by_role("button", name="drop")).to_be_enabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_enabled()
    expect(page.get_by_role("button", name="d (block)")).to_be_disabled()
    expect(page.get_by_role("button", name="catch d")).to_be_disabled()

    # undo pass, make it a catch d to show callahan button state
    page.get_by_role("button", name="Undo").click()
    page.get_by_role("button", name="Catch D").click()
    expect(page.get_by_role("button", name="point!")).to_be_enabled()
    page.get_by_role("button", name="Point!").click()

    # setup next point
    expect_next_line_text(page)
    expect_lines_selected(page, home, away)
    start_point(page)

    # line is now bench, bench is now active
    # possession is known so only home is active
    expect_players_disabled(page, home_line)
    expect_players_disabled(page, away_line)
    expect_players_enabled(page, home_bench)
    expect_players_disabled(page, away_bench)

    # select home player to start
    page.get_by_role("button", name="Christopher Keates").click()
    # no pull for other points
    expect(page.get_by_role("button", name="pull")).to_be_disabled()
    expect(page.get_by_role("button", name="drop")).to_be_disabled()
    expect(page.get_by_role("button", name="throwaway")).to_be_enabled()


def test_halftime(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # initial state (both teams enabled)
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # pull to start
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Pull").click()

    # first point
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Ashlin Kelly").click()
    page.get_by_role("button", name="Point!").click()

    # record half
    expect_next_line_text(page)
    open_hamburger_menu(page)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("menuitem", name="Record Half").click()

    # select lines again
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # after half state (both teams enabled)
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # pull to start
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()

    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    assert stats["Owen Lumley"]["pulls"] == 1
    assert stats["Brian Kells"]["pulls"] == 1


def test_resume(
    server, league, rosters, browser_context_args, browser: Browser, page: Page
) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe passed to Kevin Barford",
            "4.Kevin Barford scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # reload the app to simulate a crash or restart etc
    # playwright can spawn a new browser but they are isolated
    # it can be configured to share state but extra config kind of
    # defeats the purpose and this is sufficient
    page.goto(f"{base_url}/stat_keeper")

    # resume game
    expect(page.locator("#root")).to_contain_text(
        "Kells Angels Bicycle Club vs lumleysexuals"
    )
    expect(page.locator("#root")).to_contain_text(
        "Score: Kells Angels Bicycle Club 0 - 1 lumleysexuals"
    )
    expect(page.locator("#root")).to_contain_text("in-progress")
    page.get_by_role("link", name="Resume Game").click()
    # expect(page.locator("#root")).to_contain_text("Select players for the next point.")
    expect(page.locator("#root")).to_contain_text("Players not on the previous line are pre-selected. Adjust and confirm.")

    # test undo after resume
    page.get_by_role("button", name="Undo Last Action").click()
    expect(
        page.get_by_role("button", name="Kevin Barford")
    ).to_be_disabled()  # has possession
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe passed to Kevin Barford",
            "4.Kevin Barford passed to Owen Lumley",
            "5.Owen Lumley scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()
    assert stats["Kevin Barford"]["assists"] == 1
    assert stats["Owen Lumley"]["goals"] == 1


def test_resubmit(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    play_by_play = "".join(
        [
            "1.Brian Kells pulled",
            "2.Owen Lumley passed to Heather McCabe",
            "3.Heather McCabe passed to Kevin Barford",
            "4.Kevin Barford scored!",
        ]
    )
    expect(page.get_by_role("list")).to_contain_text(play_by_play)

    # simluate network failure
    page.route("**/submit_game", lambda route: route.abort())

    # submit
    submit_game(page, failed=True)

    # view game
    page.get_by_role("link", name="View Game").click()
    expect(page.locator("h5")).to_contain_text("Kells Angels Bicycle Club vs lumleysexuals")

    # fix network failure
    page.route("**/submit_game", lambda route: route.continue_())

    # re-submit the game
    page.get_by_role("button", name="Re-sync").click()

    # success
    expect(page.get_by_role("alert")).to_contain_text("Game successfully uploaded to server!")
    expect(page.locator("#root")).not_to_contain_text("Re-sync")

    # verify submitted stats
    stats = get_stats()
    assert stats["Brian Kells"]["pulls"] == 1
    assert stats["Heather McCabe"]["assists"] == 1
    assert stats["Kevin Barford"]["goals"] == 1


def test_edit_initial_rosters(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])

    # add league player
    page.get_by_role("combobox").nth(2).select_option("Matthew Schijns")
    page.get_by_role("button", name="Add").first.click()

    # add sub
    page.get_by_role("textbox", name="Substitute name").nth(1).click()
    page.get_by_role("textbox", name="Substitute name").nth(1).fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").nth(1).click()

    # remove player
    page.get_by_role("listitem").filter(has_text="Kevin BarfordRemove").get_by_role(
        "button"
    ).click()

    # check updated rosters
    home_roster = rosters[home]
    home_roster.append("Matthew Schijns")
    away_roster = rosters[away]
    away_roster.append("Kevin Hughes")
    away_roster.remove("Kevin Barford")
    expect_rosters(page, home_roster, away_roster)

    # start
    start_game(page)

    # submit and check game rosters
    submit_game(page)
    game = get_game(1)
    assert game["homeRoster"] == sorted(home_roster)
    assert game["awayRoster"] == sorted(away_roster)


def test_edit_rosters_mid_game(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    select_lines(page, rosters[home][:6], rosters[away][:6])
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    # edit rosters
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Edit Rosters").click()

    # add sub
    page.get_by_role("textbox", name="Substitute name").first.click()
    page.get_by_role("textbox", name="Substitute name").first.fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").first.click()
    page.get_by_role("button", name="Update Rosters").click()

    # select lines
    # expect(page.locator("#root")).to_contain_text("Select players for the next point.")
    expect(page.locator("#root")).to_contain_text("Players not on the previous line are pre-selected. Adjust and confirm.")
    select_lines(page, rosters[home][:5] + ["Kevin Hughes"], rosters[away][:6])
    expect_lines_selected(page, home, away)
    start_point(page)

    expect(page.get_by_role("button", name="Point!")).to_be_visible()
    expect(page.get_by_role("button", name="Kevin Hughes")).to_be_visible()


# test_edit_rosters_mid_point?
# and change line after?
# test change line undo


def test_change_line_mid_point(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()

    # change line
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Change Line").click()

    expect(page.locator("#root")).to_contain_text(
        "Current line is selected. Make any adjustments needed, then click 'Resume Point'."
    )
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Kyle Sprysa").click()
    page.get_by_role("button", name="Resume Point").click()

    # resume stats
    page.get_by_role("button", name="Kyle Sprysa").click()
    page.get_by_role("button", name="Point!").click()

    # submit
    submit_game(page)

    # verify stats
    stats = get_stats()
    assert stats["Brian Kells"]["pulls"] == 1
    assert stats["Kyle Sprysa"]["goals"] == 1

    # the player subbed off does not get stats for points played or +/-
    # no plus minus makes sense but technically they should get a point played
    #
    # fixing this is not straight forward and is an exisiting bug in android too
    # * if we add players to the point then undo gets hard with re-selecting the correct line
    # * we could use a substitution event that records them leaving then we can update the backend
    #   to calculate points_played by any activity on the point (because there will always be one)
    #   instead of just using the final line for the point. Then we would need to store two "denominators"
    #   one for averaging their salaray per point which includes points they subbbed off from and another
    #   to properly calculate their efficiencies. If you sub off you shouldn't get a point scored against you
    # * since there isn't an easy way to "get everything" right now. Lets keep it like it is now
    #   have which means your salaray per point is slightly higher since it contains events for points
    #   where you were subbed off but those points don't contribute to the denominator

    # verify points played
    assert stats["Kyle Sprysa"]["points_played"] == 1
    assert "Kevin Barford" not in stats

    # verify point
    game = get_game(1)
    assert "Kyle Sprysa" in game["points"][0]["offensePlayers"]
    assert "Kevin Barford" not in game["points"][0]["offensePlayers"]


def test_perf(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # define two distinct lines that will alternate
    home_line_1 = rosters[home][:6]
    home_line_2 = rosters[home][6:]
    away_line_1 = rosters[away][:6]
    away_line_2 = rosters[away][6:]

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # track timing for each point
    point_times = []

    # first half - 20 points
    for point_num in range(20):
        start_time = time.time()
        
        # select lines (auto-selected after first point)
        if point_num == 0:
            expect(page.locator("#root")).to_contain_text("Select players for the first point.")
            select_lines(page, home_line_1, away_line_1)
            expect_lines_selected(page, home, away)
        else:
            expect_next_line_text(page)
        
        start_point(page)

        # determine which team has possession and whether to pull
        if point_num == 0:
            # first point - away team pulls
            puller = away_line_1[0]  # Owen Lumley
            receiving_team = home_line_1
            
            # record the pull
            page.get_by_role("button", name=puller).click()
            page.get_by_role("button", name="Pull").click()
            
            # pass to each player on the receiving team, with the last one scoring
            for i, player in enumerate(receiving_team):
                page.get_by_role("button", name=player).click()
                if i == len(receiving_team) - 1:
                    # last player scores
                    page.get_by_role("button", name="Point!").click()
                # else it's automatically a pass to the next player
        else:
            # subsequent points - team that was scored on starts with possession
            # determine which line is currently active (alternates each point)
            if point_num % 2 == 1:
                # line 2 is active, away team starts with possession (they were scored on)
                possessing_team = away_line_2
            else:
                # line 1 is active, home team starts with possession (they were scored on)
                possessing_team = home_line_1
            
            # pass to each player on the possessing team, with the last one scoring
            for i, player in enumerate(possessing_team):
                page.get_by_role("button", name=player).click()
                if i == len(possessing_team) - 1:
                    # last player scores
                    page.get_by_role("button", name="Point!").click()
                # else it's automatically a pass to the next player

        end_time = time.time()
        point_times.append(end_time - start_time)

    # record half
    open_hamburger_menu(page)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("menuitem", name="Record Half").click()

    # second half - 20 more points
    for point_num in range(20, 40):
        start_time = time.time()
        
        # select lines for first point of second half
        if point_num == 20:
            select_lines(page, home_line_1, away_line_1)
            expect_lines_selected(page, home, away)
        else:
            expect_next_line_text(page)
        
        start_point(page)

        # determine which team has possession and whether to pull
        if point_num == 20:
            # first point of second half - home team pulls (opposite of first half)
            puller = home_line_1[0]  # Brian Kells
            receiving_team = away_line_1
            
            # record the pull
            page.get_by_role("button", name=puller).click()
            page.get_by_role("button", name="Pull").click()
            
            # pass to each player on the receiving team, with the last one scoring
            for i, player in enumerate(receiving_team):
                page.get_by_role("button", name=player).click()
                if i == len(receiving_team) - 1:
                    # last player scores
                    page.get_by_role("button", name="Point!").click()
                # else it's automatically a pass to the next player
        else:
            # subsequent points - team that was scored on starts with possession
            # determine which line is currently active (continues alternating from first half)
            if point_num % 2 == 0:
                # line 1 is active, home team starts with possession (they were scored on)
                possessing_team = home_line_1
            else:
                # line 2 is active, away team starts with possession (they were scored on)
                possessing_team = away_line_2
            
            # pass to each player on the possessing team, with the last one scoring
            for i, player in enumerate(possessing_team):
                page.get_by_role("button", name=player).click()
                if i == len(possessing_team) - 1:
                    # last player scores
                    page.get_by_role("button", name="Point!").click()
                # else it's automatically a pass to the next player

        end_time = time.time()
        point_times.append(end_time - start_time)

    # submit game
    submit_game(page)

    # verify some basic stats to ensure the game was recorded correctly
    stats = get_stats()
    # Each team should have scored 20 points (40 total)
    total_goals = sum(player_stats.get("goals", 0) for player_stats in stats.values())
    assert total_goals == 40

    # analyze performance - compute slope to ensure no exponential slowdown
    x = np.array(range(len(point_times)))
    y = np.array(point_times)
    
    # fit a linear regression line
    slope, intercept = np.polyfit(x, y, 1)
    
    # the slope should be very small (close to 0) indicating no significant slowdown
    # allow for some variance but fail if there's a clear exponential trend
    # a slope > 0.1 seconds per point would indicate serious performance degradation
    assert slope < 0.1, f"Performance degradation detected: slope = {slope:.4f} seconds per point"
    
    # also check that no individual point took an unreasonably long time
    max_time = max(point_times)
    assert max_time < 10.0, f"Individual point took too long: {max_time:.2f} seconds"
    
    print(f"Performance test completed:")
    print(f"  Total points: {len(point_times)}")
    print(f"  Average time per point: {np.mean(point_times):.3f} seconds")
    print(f"  Max time per point: {max_time:.3f} seconds")
    print(f"  Performance slope: {slope:.6f} seconds per point")


