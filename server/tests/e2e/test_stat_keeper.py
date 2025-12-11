from playwright.sync_api import Browser, Page, expect
import pytest
import re
import requests
import socket
import time

from server.api import CURRENT_LEAGUE_ID

# use `page.pause()` with `--headed` to pause and
# start the recorder. Then use the UI to make drive the test
# before copying the code back. select pytest for export

# can also use --slowmo=1000 to better watch a test


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, playwright):
    return {"viewport": {"width": 768, "height": 900}, "is_mobile": True}


def _is_port_open(port):
    """Check if a port is open on localhost."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(("localhost", port))
            return result == 0
    except:  # noqa: E722
        return False


# use vite dev server if available, otherwise fallback to static asserts
base_url = "http://localhost:5173" if _is_port_open(5173) else "http://localhost:8000"


def start_stats_keeper(page: Page):
    page.goto(f"{base_url}/stat_keeper")

    blank_slate = 'No games stored locally. Click "Start New Game" to begin.'
    expect(page.get_by_role("paragraph")).to_contain_text(blank_slate)

    click_button(page, "Start New Game")
    expect(page.locator("h5")).to_contain_text("New Game")


def select_teams(page: Page, home: str, away: str):
    # initial state
    expect(page.locator("h5")).to_contain_text("New Game")

    # select teams
    page.get_by_role("combobox", name="Home Team").click()
    page.get_by_role("option", name=home).click()

    page.get_by_role("combobox", name="Away Team").click()
    page.get_by_role("option", name=away).click()

    # create game (navigates to game view in edit rosters mode)
    click_button(page, "Create Game")


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
    expect(page.get_by_role("heading", name="Add Player from League").first).to_be_visible()
    expect(page.get_by_role("heading", name="Add Custom Substitute").first).to_be_visible()


def start_game(page: Page):
    click_button(page, "Update Rosters")


def ignore_ratio_warning(page: Page):
    def handle_ratio_warning(dialog):
        if "expected 4 ON2, 2 WN2" in dialog.message:
            dialog.accept()

    page.once("dialog", handle_ratio_warning)


def start_point(page: Page):
    ignore_ratio_warning(page)
    click_button(page, "Start Point")


def select_lines(page: Page, home_line: list[str], away_line: list[str]):
    # it would be nice if this would force the state by reseting any other selected players
    # that would remove some custom reset logic in a few tests
    for player in home_line:
        page.get_by_role("button", name=player).click()
    for player in away_line:
        page.get_by_role("button", name=player).click()


def expect_players_selected(page: Page, players: list[str]):
    for player in players:
        # Players are now selected with contained variant (vs outlined when not selected)
        expect(page.get_by_role("button", name=player)).to_contain_class("MuiButton-contained")


def expect_players_not_selected(page: Page, players: list[str]):
    for player in players:
        # Players are now not selected with outlined variant (vs contained when selected)
        expect(page.get_by_role("button", name=player)).to_contain_class("MuiButton-outlined")


def expect_lines_selected(page: Page, home: str, away: str):
    expect(page.locator("#root")).to_contain_text(f"{home} (6/6)")
    expect(page.locator("#root")).to_contain_text(f"{away} (6/6)")


def expect_game_state(page: Page, state: str):
    expect(page.locator("#root")).to_contain_text(f"Game State: {state}")


def expect_help_message(page: Page, message: str):
    expect(page.locator("#root")).to_contain_text(message)


def expect_players_enabled(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).to_be_enabled()


def expect_players_disabled(page: Page, players: list[str]):
    for player in players:
        expect(page.get_by_role("button", name=player)).to_be_disabled()


def click_button(page: Page, name: str):
    page.get_by_role("button", name=name).click()


def expect_button_enabled(page: Page, name: str):
    expect(page.get_by_role("button", name=name)).to_be_enabled()


def expect_button_disabled(page: Page, name: str):
    expect(page.get_by_role("button", name=name)).to_be_disabled()


def expect_play_by_play(page: Page, events: list[str]):
    play_by_play_text = "".join(events)
    expect(page.get_by_role("list")).to_contain_text(play_by_play_text)


def refute_play_by_play(page: Page, events: list[str]):
    play_by_play_text = "".join(events)
    expect(page.get_by_role("list")).not_to_contain_text(play_by_play_text)


def expect_next_line_text(page: Page):
    expect_help_message(page, "Players not on the previous line are pre-selected. Adjust and confirm.")
    expect_game_state(page, "SelectingLines")


def expect_text(page: Page, text: str):
    expect(page.locator("#root")).to_contain_text(text)


def open_hamburger_menu(page: Page):
    page.get_by_role("button").filter(has_text=re.compile(r"^$")).click()


def submit_game(page: Page, *, failed: bool = False):
    open_hamburger_menu(page)

    # click submit game menu item
    page.get_by_role("menuitem", name="Submit Game").click()

    # wait for and interact with the MUI confirmation dialog
    expect(page.get_by_role("heading", name="Confirm Game Submission")).to_be_visible()
    expect(page.get_by_text("Are you sure you want to submit this game?")).to_be_visible()

    # click the submit button in the dialog
    page.get_by_role("button", name="Submit").click()

    # wait for redirect and check for appropriate snackbar/alert message
    page.wait_for_url("**/stat_keeper")
    expect(page.locator("#root")).to_contain_text("Local Games")

    if failed:
        # expect error snackbar would have appeared (though we've already navigated away)
        expect(page.locator("#root")).to_contain_text("sync-error")
    else:
        # expect success - game should be uploaded
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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
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
    expect_game_state(page, "Start")

    click_button(page, "Brian Kells")
    expect_game_state(page, "Pull")

    click_button(page, "Pull")
    expect_game_state(page, "PickUp")

    click_button(page, "Owen Lumley")
    expect_game_state(page, "AfterPull")

    click_button(page, "Heather McCabe")
    expect_game_state(page, "Normal")

    click_button(page, "Kevin Barford")
    expect_game_state(page, "Normal")

    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Kevin Barford",
        "4.Kevin Barford scored!",
    ]
    expect_play_by_play(page, play_by_play)

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


def test_throwaway(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")

    # pre turnover state
    expect_players_disabled(page, home_line)
    # player with the disk is enabled
    expect_players_enabled(page, [p for p in away_line if p != "Heather McCabe"])

    # button state
    expect_button_enabled(page, "Throwaway")
    expect_button_enabled(page, "Drop")
    expect_button_disabled(page, "D (Block)")
    expect_button_disabled(page, "Catch D")

    # record throwaway (no D)
    click_button(page, "Throwaway")
    expect_game_state(page, "PickUp")

    # other team is enabled now
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    # select who picked up the disc to complete
    click_button(page, "Brian Kells")
    expect_game_state(page, "AfterTurnover")

    # D buttons become enabled
    expect_button_enabled(page, "D (Block)")
    expect_button_enabled(page, "Catch D")

    # continue with a pass for a pure throw_away
    click_button(page, "Scott Higgins")  # Pass
    expect_game_state(page, "Normal")

    # D buttons disabled again
    expect_button_disabled(page, "D (Block)")
    expect_button_disabled(page, "Catch D")

    # record D (throwaway -> defender -> D)
    click_button(page, "Throwaway")
    expect_game_state(page, "PickUp")
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, away_line)
    click_button(page, "Owen Lumley")
    expect_game_state(page, "AfterTurnover")
    click_button(page, "D (Block)")
    expect_game_state(page, "PickUp")

    # select who picked up the disc to continue
    click_button(page, "Owen Lumley")
    expect_game_state(page, "Normal")
    click_button(page, "Heather McCabe")  # Pass
    expect_game_state(page, "Normal")

    # record catch D (throwaway -> defender -> Catch D)
    click_button(page, "Throwaway")
    expect_game_state(page, "PickUp")
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)
    click_button(page, "Ashlin Kelly")
    expect_game_state(page, "AfterTurnover")
    click_button(page, "Catch D")
    expect_game_state(page, "Normal")

    # defender already has the disk
    expect_button_disabled(page, "Ashlin Kelly")
    click_button(page, "Scott Higgins")  # Pass
    expect_game_state(page, "Normal")
    click_button(page, "Point!")

    play_by_play = [
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
    expect_play_by_play(page, play_by_play)
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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Drop")
    expect_game_state(page, "PickUp")

    # possession flips
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    click_button(page, "Brian Kells")
    expect_game_state(page, "AfterDrop")

    # D buttons should be disabled after a drop (no defensive play was made)
    expect_button_disabled(page, "D (Block)")
    expect_button_disabled(page, "Catch D")

    click_button(page, "Ashlin Kelly")
    expect_game_state(page, "Normal")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe dropped it",
        "4.Brian Kells passed to Ashlin Kelly",
        "5.Ashlin Kelly scored!",
    ]
    expect_play_by_play(page, play_by_play)
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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Throwaway")
    click_button(page, "Ashlin Kelly")
    expect_game_state(page, "AfterTurnover")
    click_button(page, "Catch D")
    expect_game_state(page, "Normal")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley threw it away",
        "3.Ashlin Kelly got a block",
        "4.Ashlin Kelly scored!",
    ]
    expect_play_by_play(page, play_by_play)
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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")

    # check possession
    expect_button_enabled(page, "Owen Lumley")
    expect_button_disabled(page, "Heather McCabe")

    # undo pass
    click_button(page, "Undo")

    # possesion moves back
    expect_button_disabled(page, "Owen Lumley")
    expect_button_enabled(page, "Heather McCabe")

    # new pass
    click_button(page, "Kevin Barford")
    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Kevin Barford",
    ]
    expect_play_by_play(page, play_by_play)

    # throw away undo
    click_button(page, "Throwaway")
    expect_play_by_play(page, ["Kevin Barford threw it away"])
    click_button(page, "Undo")
    refute_play_by_play(page, ["Kevin Barford threw it away"])

    # drop undo
    click_button(page, "Drop")
    expect_play_by_play(page, ["Kevin Barford dropped it"])
    click_button(page, "Undo")
    refute_play_by_play(page, ["Kevin Barford dropped it"])

    # d undo
    click_button(page, "Throwaway")
    click_button(page, "Scott Higgins")
    click_button(page, "D (Block)")
    expect_play_by_play(page, ["Kevin Barford threw it away"])
    expect_play_by_play(page, ["Scott Higgins got a block"])
    expect_button_enabled(page, "Scott Higgins")  # not a catch d so no one has possession
    click_button(page, "Undo")
    expect_play_by_play(page, ["Kevin Barford threw it away"])
    refute_play_by_play(page, ["Scott Higgins got a block"])
    # undo possession
    expect_button_disabled(page, "Scott Higgins")
    click_button(page, "Undo")
    expect_button_enabled(page, "Scott Higgins")
    # undo throw away
    click_button(page, "Undo")
    refute_play_by_play(page, ["Kevin Barford threw it away"])

    # catch d undo
    click_button(page, "Throwaway")
    click_button(page, "Scott Higgins")
    click_button(page, "Catch D")
    expect_play_by_play(page, ["Kevin Barford threw it away"])
    expect_play_by_play(page, ["Scott Higgins got a block"])
    expect_button_disabled(page, "Scott Higgins")  # catch d so he has possession
    click_button(page, "Undo")
    expect_play_by_play(page, ["Kevin Barford threw it away"])
    refute_play_by_play(page, ["Scott Higgins got a block"])
    # undo possession
    expect_button_disabled(page, "Scott Higgins")
    click_button(page, "Undo")
    expect_button_enabled(page, "Scott Higgins")
    # undo throw away
    click_button(page, "Undo")
    refute_play_by_play(page, ["Kevin Barford threw it away"])

    # undo point
    # first we need another pass.
    click_button(page, "Owen Lumley")
    click_button(page, "Point!")
    expect_play_by_play(page, ["Owen Lumley scored!"])
    click_button(page, "Undo Point")
    refute_play_by_play(page, ["Owen Lumley scored!"])

    # finish point
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Kevin Barford",
        "3.Kevin Barford passed to Owen Lumley",
        "4.Owen Lumley scored!",
    ]
    expect_play_by_play(page, play_by_play)
    expect_next_line_text(page)

    # start second point
    start_point(page)

    # undo callahan
    click_button(page, "Christopher Keates")
    click_button(page, "Throwaway")
    click_button(page, "Kyle Sprysa")
    click_button(page, "Catch D")
    click_button(page, "Point!")
    click_button(page, "Undo Point")
    click_button(page, "Kirsten Querbach")
    click_button(page, "Point!")

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


def test_undo_pull(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # select player
    click_button(page, "Owen Lumley")
    expect_game_state(page, "Pull")
    click_button(page, "Undo")
    expect_game_state(page, "Start")

    # at the begining again. nothing more to undo
    expect_button_disabled(page, "Undo")

    # select player (opposite team as before now) and pull
    click_button(page, "Brian Kells")
    expect_game_state(page, "Pull")
    click_button(page, "Pull")
    expect_game_state(page, "PickUp")
    expect_play_by_play(page, ["1.Brian Kells pulled"])

    # receive
    click_button(page, "Owen Lumley")
    expect_game_state(page, "AfterPull")

    # undo twice
    click_button(page, "Undo")
    expect_game_state(page, "PickUp")
    expect_play_by_play(page, ["1.Brian Kells pulled"])

    click_button(page, "Undo")
    expect(page.locator("#root")).not_to_contain_text("1.Brian Kells pulled")

    # pull again
    click_button(page, "Pull")
    expect_play_by_play(page, ["1.Brian Kells pulled"])


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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")

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
    expect_button_disabled(page, "Pull")
    expect_button_disabled(page, "Point!")
    expect_button_disabled(page, "Drop")
    expect_button_disabled(page, "Throwaway")
    expect_button_disabled(page, "D (Block)")
    expect_button_disabled(page, "Catch D")
    # nothing has happened yet. nothing to undo
    expect_button_disabled(page, "Undo")

    # player is chosen
    # away is pulling
    click_button(page, "Owen Lumley")
    expect_players_disabled(page, home_line)
    expect_players_disabled(page, away_line)
    # only pull and undo enabled
    expect_button_enabled(page, "Pull")
    expect_button_disabled(page, "Point!")
    expect_button_disabled(page, "Drop")
    expect_button_disabled(page, "Throwaway")
    expect_button_disabled(page, "D (Block)")
    expect_button_disabled(page, "Catch D")
    expect_button_enabled(page, "Undo")

    # pull has to be next (or undo)
    click_button(page, "Pull")
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "point!")
    expect_button_disabled(page, "drop")
    expect_button_disabled(page, "throwaway")
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # player receives the pull or picks it up
    # they can drop it or throw it away
    click_button(page, "Brian Kells")
    expect_players_enabled(page, [p for p in home_line if p != "Brian Kells"])
    expect_players_disabled(page, away_line)
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "point!")
    expect_button_enabled(page, "drop")
    expect_button_enabled(page, "throwaway")
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # first pass
    click_button(page, "Ashlin Kelly")
    expect_players_enabled(page, [p for p in home_line if p != "Ashlin Kelly"])
    expect_players_disabled(page, away_line)
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "point!")  # point disabled (QuebecVariant)
    expect_button_enabled(page, "drop")
    expect_button_enabled(page, "throwaway")
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # turnover
    click_button(page, "Throwaway")
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, away_line)
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "point!")
    expect_button_disabled(page, "drop")
    expect_button_disabled(page, "throwaway")
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # player is selected next then a D or Catch D can be recorded or not for a pick up
    # a player is technically able to drop it although it would be rare. this would
    # result in an immediate turnover with the only offense recording being a drop
    #
    # in this case we proceed with a pick-up from a plain throwaway
    click_button(page, "Owen Lumley")
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, [p for p in away_line if p != "Owen Lumley"])
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "point!")
    expect_button_enabled(page, "drop")
    expect_button_enabled(page, "throwaway")
    expect_button_enabled(page, "d (block)")
    expect_button_enabled(page, "catch d")

    # pass (d buttons get disabled now)
    click_button(page, "Heather McCabe")
    expect_button_disabled(page, "pull")
    expect_button_enabled(page, "point!")
    expect_button_enabled(page, "drop")
    expect_button_enabled(page, "throwaway")
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # undo pass, make it a catch d
    click_button(page, "Undo")
    click_button(page, "Catch D")

    # can pass
    expect_players_disabled(page, home_line)
    expect_players_enabled(page, [p for p in away_line if p != "Owen Lumley"])

    # catch d is now disabled
    expect_button_disabled(page, "d (block)")
    expect_button_disabled(page, "catch d")

    # a callahan is possible from a catch d
    expect_button_enabled(page, "point!")
    click_button(page, "Point!")

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

    # select home player to start (this creates the active point since possession is known)
    click_button(page, "Christopher Keates")
    expect_game_state(page, "FirstThrow")

    # no pull for other points
    expect_button_disabled(page, "pull")
    expect_button_disabled(page, "drop")
    expect_button_enabled(page, "throwaway")


def test_halftime(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # initial state (both teams enabled)
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # pull to start
    click_button(page, "Owen Lumley")
    click_button(page, "Pull")

    # first point
    click_button(page, "Brian Kells")
    click_button(page, "Ashlin Kelly")
    click_button(page, "Brian Kells")
    click_button(page, "Ashlin Kelly")
    click_button(page, "Point!")

    # record half
    expect_next_line_text(page)
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Record Half").click()

    # expect success snackbar
    expect(page.get_by_role("alert")).to_contain_text("Half time recorded.")

    # expect select lines state with no players selected
    expect_help_message(page, "Select players for the next point.")
    expect_game_state(page, "SelectingLines")

    # test undoing half time
    click_button(page, "Undo Half")
    expect_next_line_text(page)

    # should also be able to undo point from here
    click_button(page, "Undo Point")

    # the correct line is selected still
    expect_players_enabled(page, [p for p in home_line if p != "Ashlin Kelly"])
    expect_players_disabled(page, away_line)
    click_button(page, "Point!")

    # record half again
    expect_next_line_text(page)
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Record Half").click()

    # select lines again
    expect_help_message(page, "Select players for the next point.")
    expect_game_state(page, "SelectingLines")
    select_lines(page, rosters[home][6:], rosters[away][6:])  # reset
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # after half state (both teams enabled)
    # ideally it should force the correct team to pull after half
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # pull to start
    click_button(page, "Brian Kells")
    click_button(page, "Pull")

    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Kevin Barford")
    click_button(page, "Point!")

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    assert stats["Owen Lumley"]["pulls"] == 1
    assert stats["Brian Kells"]["pulls"] == 1


def test_resume(server, league, rosters, browser_context_args, browser: Browser, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Kevin Barford")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Kevin Barford",
        "4.Kevin Barford scored!",
    ]
    expect_play_by_play(page, play_by_play)
    expect_next_line_text(page)

    # reload the app to simulate a crash or restart etc
    # playwright can spawn a new browser but they are isolated
    # it can be configured to share state but extra config kind of
    # defeats the purpose and this is sufficient
    page.goto(f"{base_url}/stat_keeper")

    # resume game
    expect_text(page, "Kells Angels Bicycle Club vs lumleysexuals")
    expect_text(page, "Score: Kells Angels Bicycle Club 0 - 1 lumleysexuals")

    expect_text(page, "in-progress")
    page.get_by_role("link", name="Resume Game").click()

    # right back where we left off
    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Kevin Barford",
        "4.Kevin Barford scored!",
    ]
    expect_play_by_play(page, play_by_play)
    expect_next_line_text(page)

    # test undo after resume
    click_button(page, "Undo Point")
    expect_button_disabled(page, "Kevin Barford")  # has possession
    click_button(page, "Owen Lumley")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Kevin Barford",
        "4.Kevin Barford passed to Owen Lumley",
        "5.Owen Lumley scored!",
    ]
    expect_play_by_play(page, play_by_play)
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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Kevin Barford")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Kevin Barford",
        "4.Kevin Barford scored!",
    ]
    expect_play_by_play(page, play_by_play)

    # simluate network failure
    page.route("**/submit_game", lambda route: route.abort())

    # submit
    submit_game(page, failed=True)

    # view game
    page.get_by_role("link", name="View Game").click()
    expect_text(page, "Kells Angels Bicycle Club vs lumleysexuals")

    # fix network failure
    page.route("**/submit_game", lambda route: route.continue_())

    # re-submit the game
    click_button(page, "Re-sync")

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

    # create game (now navigates to roster editing view)
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])

    # add league player (home team - first combobox)
    page.get_by_role("combobox").first.select_option("Matthew Schijns")
    page.get_by_role("button", name="Add").first.click()

    # add sub (away team - second textbox and button)
    page.get_by_role("textbox", name="Name").nth(1).click()
    page.get_by_role("textbox", name="Name").nth(1).fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").nth(1).click()

    # remove player (away team)
    page.get_by_role("listitem").filter(has_text="Kevin BarfordRemove").get_by_role("button").click()

    # check updated rosters
    home_roster = rosters[home]
    home_roster.append("Matthew Schijns(S)")
    away_roster = rosters[away]
    away_roster.append("Kevin Hughes(S)")
    away_roster.remove("Kevin Barford")
    expect_rosters(page, home_roster, away_roster)

    # start (Update Rosters button)
    start_game(page)

    # need to do at least one point before we can submit

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Owen Lumley")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe passed to Owen Lumley",
        "4.Owen Lumley scored!",
    ]
    expect_play_by_play(page, play_by_play)

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
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    select_lines(page, rosters[home][:6], rosters[away][:6])
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Kevin Barford")
    click_button(page, "Point!")

    # edit rosters
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Edit Rosters").click()

    # add sub
    page.get_by_role("textbox", name="Name").first.click()
    page.get_by_role("textbox", name="Name").first.fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").first.click()

    # test removing and re-adding a roster player doesn't add (S) suffix
    page.get_by_role("listitem").filter(has_text="Brian KellsRemove").get_by_role("button").click()
    expect(page.locator("#root")).not_to_contain_text("Brian KellsRemove")
    page.get_by_role("combobox").first.select_option("Brian Kells")
    page.get_by_role("button", name="Add").first.click()

    # verify Brian Kells was added back WITHOUT (S) suffix
    expect(page.locator("#root")).to_contain_text("Brian KellsRemove")
    expect(page.locator("#root")).not_to_contain_text("Brian Kells(S)")

    # finish
    click_button(page, "Update Rosters")

    # select lines
    expect_text(page, "Players not on the previous line are pre-selected. Adjust and confirm.")
    # we added one sub so the flip selection selects the other 7 players now
    # we need to un-select one. this isn't really realistic as it is easier and better to remove
    # players who aren't there so in practice the flip logic works fine.
    click_button(page, "Rob Ives")
    expect_lines_selected(page, home, away)
    start_point(page)

    expect(page.get_by_role("button", name="Point!")).to_be_visible()
    expect(page.get_by_role("button", name="Kevin Hughes(S)")).to_be_enabled()

    click_button(page, "Kevin Hughes(S)")
    click_button(page, "Krys Kudakiewicz")

    play_by_play = [
        "1.Kevin Hughes(S) passed to Krys Kudakiewicz",
    ]
    expect_play_by_play(page, play_by_play)


def test_edit_rosters_mid_point_and_change_line(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    select_lines(page, rosters[home][:6], rosters[away][:6])
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")

    # edit rosters
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Edit Rosters").click()

    # add sub
    page.get_by_role("textbox", name="Name").first.click()
    page.get_by_role("textbox", name="Name").first.fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").first.click()
    click_button(page, "Update Rosters")

    # change line
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Change Line").click()
    ignore_ratio_warning(page)
    expect(page.locator("#root")).to_contain_text("Resume Point")

    # sub brian for kevin
    click_button(page, "Brian Kells")
    click_button(page, "Kevin Hughes(S)")
    click_button(page, "Resume Point")

    click_button(page, "Throwaway")
    click_button(page, "Kevin Hughes(S)")
    click_button(page, "Catch D")
    click_button(page, "Ashlin Kelly")
    click_button(page, "Point!")

    # submit
    submit_game(page)

    # verify stats
    stats = get_stats()
    assert stats["Kevin Hughes(S)"]["assists"] == 1

    # verify game
    game = get_game(1)
    assert "Kevin Hughes(S)" in game["homeRoster"]
    assert "Kevin Hughes(S)" in game["points"][0]["defensePlayers"]


def test_change_line_mid_point(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")

    # change line
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Change Line").click()

    # help text
    message = "Tap player names to Edit the active line, then click 'Resume Point'."
    expect_help_message(page, message)

    # undo is not available
    expect(page.locator("#root")).not_to_contain_text("Undo")

    # original line selected
    expect_players_enabled(page, home_line)
    expect_players_enabled(page, away_line)

    # sub kevin for kyle
    click_button(page, "Kevin Barford")
    click_button(page, "Kyle Sprysa")

    # resume
    ignore_ratio_warning(page)
    click_button(page, "Resume Point")

    # play by play
    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
    ]
    expect_play_by_play(page, play_by_play)

    # undo here removes the last action
    # changing the line is not an un-doable action. just change it again
    click_button(page, "Undo")

    # after undo play by play
    expect_play_by_play(page, ["1.Brian Kells pulled"])
    refute_play_by_play(page, ["2.Owen Lumley passed to Heather McCabe"])

    # resume stats
    click_button(page, "Kyle Sprysa")
    click_button(page, "Heather McCabe")
    click_button(page, "Kyle Sprysa")
    click_button(page, "Point!")

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


def test_back_to_back_defense(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record stats: pull and initial pass
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")

    # first D event - throwaway and block
    click_button(page, "Throwaway")
    click_button(page, "Ashlin Kelly")
    click_button(page, "D (Block)")

    # verify first D is recorded
    expect_play_by_play(page, ["Heather McCabe threw it away"])
    expect_play_by_play(page, ["Ashlin Kelly got a block"])

    # Ashlin doesn't have possession (regular D block, not catch D)
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    # second D event - pick up disc, throwaway, and another block
    click_button(page, "Ashlin Kelly")
    click_button(page, "Throwaway")
    click_button(page, "Owen Lumley")
    click_button(page, "D (Block)")

    # verify second D is recorded
    expect_play_by_play(page, ["Ashlin Kelly threw it away"])
    expect_play_by_play(page, ["Owen Lumley got a block"])

    # finish the point
    click_button(page, "Owen Lumley")
    click_button(page, "Heather McCabe")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley passed to Heather McCabe",
        "3.Heather McCabe threw it away",
        "4.Ashlin Kelly got a block",
        "5.Ashlin Kelly threw it away",
        "6.Owen Lumley got a block",
        "7.Owen Lumley passed to Heather McCabe",
        "8.Heather McCabe scored!",
    ]
    expect_play_by_play(page, play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    # both players got a block
    assert stats["Ashlin Kelly"]["d_blocks"] == 1
    assert stats["Owen Lumley"]["d_blocks"] == 1

    # both players threw it away
    assert stats["Ashlin Kelly"]["throw_aways"] == 1
    assert stats["Heather McCabe"]["throw_aways"] == 1

    # goal
    assert stats["Heather McCabe"]["goals"] == 1


# this isn't actually a special case if you understand the underlying logic
# but since that is not always clear having this test is worth it.
def test_dropped_pull(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")
    home_line = rosters[home][:6]
    away_line = rosters[away][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # record pull
    expect_game_state(page, "Start")
    click_button(page, "Brian Kells")
    expect_game_state(page, "Pull")
    click_button(page, "Pull")
    expect_game_state(page, "PickUp")

    # receiving player drops the pull
    click_button(page, "Owen Lumley")
    expect_game_state(page, "AfterPull")
    click_button(page, "Drop")
    expect_game_state(page, "PickUp")

    # verify pull and drop are recorded
    expect_play_by_play(page, ["Brian Kells pulled"])
    expect_play_by_play(page, ["Owen Lumley dropped it"])

    # possession flips to pulling team
    expect_players_enabled(page, home_line)
    expect_players_disabled(page, away_line)

    # finish the point
    click_button(page, "Brian Kells")
    click_button(page, "Ashlin Kelly")
    click_button(page, "Point!")

    play_by_play = [
        "1.Brian Kells pulled",
        "2.Owen Lumley dropped it",
        "3.Brian Kells passed to Ashlin Kelly",
        "4.Ashlin Kelly scored!",
    ]
    expect_play_by_play(page, play_by_play)
    expect_next_line_text(page)

    # submit
    submit_game(page)

    # verify submitted stats
    stats = get_stats()

    # pull stats
    assert stats["Brian Kells"]["pulls"] == 1

    # drop stats
    assert stats["Owen Lumley"]["drops"] == 1
    assert stats["Owen Lumley"]["o_points_against"] == 1

    # goal stats
    assert stats["Ashlin Kelly"]["goals"] == 1
    assert stats["Ashlin Kelly"]["d_points_for"] == 1


def test_custom_substitutes(session, server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

    # create game
    select_teams(page, home, away)
    expect_rosters(page, rosters[home], rosters[away])

    # add open sub to the home team
    page.get_by_role("textbox", name="Name").first.click()
    page.get_by_role("textbox", name="Name").first.fill("Open Sub")
    page.get_by_role("button", name="Add Sub").first.click()

    # add wn2 sub to away team
    page.get_by_role("textbox", name="Name").nth(1).click()
    page.get_by_role("textbox", name="Name").nth(1).fill("WN2 Sub")
    page.get_by_role("checkbox", name="ON2").nth(1).uncheck()
    page.get_by_role("button", name="Add Sub").nth(1).click()

    # check updated rosters - these should now include the subs
    home_roster = rosters[home]
    home_roster.append("Open Sub(S)")
    away_roster = rosters[away]
    away_roster.append("WN2 Sub(S)")
    expect_rosters(page, home_roster, away_roster)

    # start game
    start_game(page)

    # select lines including the substitutes
    home_line = rosters[home][:5] + ["Open Sub(S)"]
    away_line = rosters[away][:5] + ["WN2 Sub(S)"]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home, away)
    start_point(page)

    # check that the subs are styled properly
    open_sub_button = page.get_by_role("button", name="Open Sub(S)")
    wn2_sub_button = page.get_by_role("button", name="WN2 Sub(S)")

    expect(open_sub_button).to_have_css("background-color", "rgb(227, 242, 253)")  # blue
    expect(wn2_sub_button).to_have_css("background-color", "rgb(243, 229, 245)")  # purple

    # record a simple point using the substitute
    click_button(page, "Brian Kells")
    click_button(page, "Pull")
    click_button(page, "Owen Lumley")
    click_button(page, "Karen Kavanagh")
    click_button(page, "WN2 Sub(S)")
    click_button(page, "Point!")

    # submit game
    submit_game(page)

    # verify submitted stats - check that the substitute appears in stats
    stats = get_stats()
    assert "WN2 Sub(S)" in stats
    assert stats["WN2 Sub(S)"]["goals"] == 1

    # Get the game data to check roster submission
    game = get_game(1)
    assert "Open Sub(S)" in game["homeRoster"]
    assert "WN2 Sub(S)" in game["awayRoster"]

    # this bug isn't exposed to the API because we only return the gender in the teams response
    # and not in the game stats response which means there is nothing that returns substitute genders
    # none the less they are wrong, they get defaulted in the database. this can be fixed after we deprecate
    # the android app and can change the upload format.
    from sqlmodel import select

    import server.db as db

    player = session.exec(select(db.Player).where(db.Player.name == "Open Sub(S)")).first()
    assert player.gender is None
    assert not player.is_open  # bug
    player = session.exec(select(db.Player).where(db.Player.name == "WN2 Sub(S)")).first()
    assert player.gender is None
    assert not player.is_open


def test_select_scheduled_matchup(server, league, rosters, matchup, page: Page) -> None:
    start_stats_keeper(page)
    home_team_name = "Kells Angels Bicycle Club"
    away_team_name = "lumleysexuals"

    # verify upcoming games section is visible
    expect(page.locator("#root")).to_contain_text("Upcoming Games")

    # verify matchup is shown with team names
    expect(page.locator("#root")).to_contain_text(home_team_name)
    expect(page.locator("#root")).to_contain_text(away_team_name)
    expect(page.locator("#root")).to_contain_text(f"Week {matchup.week}")

    # click on the matchup to select it
    page.locator(f"text={home_team_name} vs {away_team_name}").click()

    # verify teams are pre-selected in the Create Game section
    expect(page.locator("#root")).to_contain_text("Create Game")

    # verify week is pre-filled
    week_input = page.get_by_label("Week")
    expect(week_input).to_have_value(str(matchup.week))

    # create game
    click_button(page, "Create Game")

    # verify we're on the game page with rosters
    expect_rosters(page, rosters[home_team_name], rosters[away_team_name])

    # start game and verify it works
    start_game(page)

    # select lines and play a quick point
    home_line = rosters[home_team_name][:6]
    away_line = rosters[away_team_name][:6]
    select_lines(page, home_line, away_line)
    expect_lines_selected(page, home_team_name, away_team_name)
    start_point(page)

    # quick point
    click_button(page, home_line[0])
    click_button(page, "Pull")
    click_button(page, away_line[0])
    click_button(page, away_line[1])
    click_button(page, away_line[2])
    click_button(page, "Point!")

    # submit
    submit_game(page)

    # verify game was created with correct teams and week
    game = get_game(1)
    assert game["homeTeam"] == home_team_name
    assert game["awayTeam"] == away_team_name
    assert game["week"] == matchup.week


def set_player_gender(session, league_id: int, name: str, gender: str) -> None:
    from sqlmodel import select

    import server.db as db

    player = session.exec(select(db.Player).where(db.Player.league_id == league_id, db.Player.name == name)).first()
    player.gender = gender
    session.add(player)


def test_select_lines_warnings(session, server, league, rosters, page: Page) -> None:
    home_team_name = "Kells Angels Bicycle Club"
    away_team_name = "lumleysexuals"

    # the app will sort players so we sort the list here so we know
    # what order the genders will be
    sorted_home_roster = sorted(rosters[home_team_name])
    sorted_away_roster = sorted(rosters[away_team_name])

    # set player genders in order (the app will sort them) for convience
    for name in sorted_home_roster[:8]:
        set_player_gender(session, league.id, name, "male")
    for name in sorted_home_roster[8:]:
        set_player_gender(session, league.id, name, "female")
    for name in sorted_away_roster[:8]:
        set_player_gender(session, league.id, name, "male")
    for name in sorted_away_roster[8:]:
        set_player_gender(session, league.id, name, "female")
    session.commit()

    # create game
    start_stats_keeper(page)
    select_teams(page, home_team_name, away_team_name)
    expect_rosters(page, rosters[home_team_name], rosters[away_team_name])
    start_game(page)

    # select lines
    expect_help_message(page, "Select players for the first point.")
    expect_game_state(page, "SelectingLines")

    # dialogs are auto-clicked in playwright. this adds extra insurance we hit each
    # handler and make the message assertions.
    dialog_handled = False

    # Helper function to create dialog handlers for different warning types
    def expect_dialog_and_dismiss(expected_messages):
        """Helper to create a dialog handler that checks for expected messages and dismisses"""
        nonlocal dialog_handled
        dialog_handled = False

        def handler(dialog):
            nonlocal dialog_handled
            dialog_handled = True
            for expected in expected_messages:
                assert expected in dialog.message
            dialog.dismiss()

        return handler

    # not enough left
    home_line = rosters[home_team_name][:5]
    away_line = rosters[away_team_name][:6]
    select_lines(page, home_line, away_line)

    dialog_handled = False
    page.once("dialog", expect_dialog_and_dismiss([f"{home_team_name}: 5/6 players selected"]))
    click_button(page, "Start Point")
    assert dialog_handled
    select_lines(page, home_line, away_line)  # reset

    # not enough right
    home_line = rosters[home_team_name][:6]
    away_line = rosters[away_team_name][:5]
    select_lines(page, home_line, away_line)

    dialog_handled = False
    page.once("dialog", expect_dialog_and_dismiss([f"{away_team_name}: 5/6 players selected"]))
    click_button(page, "Start Point")
    assert dialog_handled
    select_lines(page, home_line, away_line)  # reset

    # too many setup
    home_line = rosters[home_team_name][:6]
    away_line = rosters[away_team_name][:6]

    # too many left
    dialog_handled = False
    select_lines(page, home_line, away_line)
    page.once("dialog", expect_dialog_and_dismiss([f"Cannot select more than 6 players for {home_team_name}."]))
    # click 7th player triggers dialog
    click_button(page, rosters[home_team_name][7])
    assert dialog_handled

    # too many right
    dialog_handled = False
    page.once("dialog", expect_dialog_and_dismiss([f"Cannot select more than 6 players for {away_team_name}."]))
    click_button(page, rosters[away_team_name][7])
    assert dialog_handled

    # reset
    select_lines(page, home_line, away_line)

    # Ratio error
    home_line = sorted_home_roster[:5] + sorted_home_roster[9:10]  # 5 ON2 1 WN2
    away_line = sorted_away_roster[:3] + sorted_away_roster[9:]  # 3 ON2 3 WN2
    select_lines(page, home_line, away_line)

    dialog_handled = False
    page.once("dialog", expect_dialog_and_dismiss([f"{home_team_name}: 5 ON2, 1 WN2", f"{away_team_name}: 3 ON2, 3 WN2"]))
    click_button(page, "Start Point")
    assert dialog_handled
    select_lines(page, home_line, away_line)  # reset

    # Ratio error
    home_line = sorted_home_roster[:2] + sorted_home_roster[8:]  # 2 ON2 4 WN2
    away_line = sorted_away_roster[:4] + sorted_away_roster[10:]  # 4 ON2 2 WN2
    select_lines(page, home_line, away_line)

    dialog_handled = False
    page.once("dialog", expect_dialog_and_dismiss([f"{home_team_name}: 2 ON2, 4 WN2"]))
    click_button(page, "Start Point")
    assert dialog_handled
    select_lines(page, home_line, away_line)  # reset

    # Valid line
    home_line = sorted_home_roster[:4] + sorted_home_roster[10:]  # 4 ON2 2 WN2
    away_line = sorted_away_roster[:4] + sorted_away_roster[10:]  # 4 ON2 2 WN2
    select_lines(page, home_line, away_line)
    click_button(page, "Start Point")

    # game started
    expect_game_state(page, "Start")


def test_perf(server, league, rosters, page: Page) -> None:
    start_stats_keeper(page)
    home = "Kells Angels Bicycle Club"
    away = "lumleysexuals"

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
        # select lines (auto-selected after first point)
        if point_num == 0:
            expect_help_message(page, "Select players for the first point.")
            expect_game_state(page, "SelectingLines")
            select_lines(page, home_line_1, away_line_1)
            expect_lines_selected(page, home, away)
        else:
            expect_next_line_text(page)

        start_time = time.time()
        start_point(page)

        # determine which team has possession and whether to pull
        if point_num == 0:
            # first point - away team pulls
            puller = away_line_1[0]  # Owen Lumley
            receiving_team = home_line_1

            # record the pull
            page.get_by_role("button", name=puller).click()
            click_button(page, "Pull")

            # pass to each player on the receiving team, with the last one scoring
            for i, player in enumerate(receiving_team):
                page.get_by_role("button", name=player).click()
                if i == len(receiving_team) - 1:
                    click_button(page, "Point!")
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
                    click_button(page, "Point!")

        end_time = time.time()
        point_times.append(end_time - start_time)

    # record half
    open_hamburger_menu(page)
    page.get_by_role("menuitem", name="Record Half").click()

    # wait for snackbar to appear and disappear
    expect(page.get_by_role("alert")).to_contain_text("Half time recorded.")

    select_lines(page, home_line_1, away_line_1)  # reset

    # second half - 20 more points
    for point_num in range(20, 40):
        # select lines for first point of second half
        if point_num == 20:
            select_lines(page, home_line_1, away_line_1)
            expect_lines_selected(page, home, away)
        else:
            expect_next_line_text(page)

        start_time = time.time()
        start_point(page)

        # determine which team has possession and whether to pull
        # use same logic as first half but offset by 20
        adjusted_point_num = point_num - 20

        if adjusted_point_num == 0:
            # first point of second half - home team pulls (opposite of first half)
            puller = home_line_1[0]  # Brian Kells
            receiving_team = away_line_1

            # record the pull
            page.get_by_role("button", name=puller).click()
            click_button(page, "Pull")

            # pass to each player on the receiving team, with the last one scoring
            for i, player in enumerate(receiving_team):
                page.get_by_role("button", name=player).click()
                if i == len(receiving_team) - 1:
                    click_button(page, "Point!")
        else:
            # subsequent points - team that was scored on starts with possession
            # determine which line is currently active (alternates each point)
            if adjusted_point_num % 2 == 1:
                # line 2 is active, home team starts with possession (they were scored on)
                possessing_team = home_line_2
            else:
                # line 1 is active, away team starts with possession (they were scored on)
                possessing_team = away_line_1

            # pass to each player on the possessing team, with the last one scoring
            for i, player in enumerate(possessing_team):
                page.get_by_role("button", name=player).click()
                if i == len(possessing_team) - 1:
                    click_button(page, "Point!")

        end_time = time.time()
        point_times.append(end_time - start_time)

    # submit game
    submit_game(page)

    # verify stats
    stats = get_stats()

    # Each team should have scored 20 points (40 total)
    total_goals = sum(player_stats.get("goals", 0) for player_stats in stats.values())
    assert total_goals == 40

    # last player on each line should have 10 goals
    assert stats[home_line_1[-1]]["goals"] == 10
    assert stats[home_line_2[-1]]["goals"] == 10
    assert stats[away_line_1[-1]]["goals"] == 10
    assert stats[away_line_2[-1]]["goals"] == 10

    # analyze performance - compute slope to ensure no exponential slowdown
    n = len(point_times)
    x_values = list(range(n))

    # calculate means
    x_mean = sum(x_values) / n
    y_mean = sum(point_times) / n

    # calculate slope using least squares formula
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, point_times))
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    slope = numerator / denominator if denominator != 0 else 0

    # the slope should be very small (close to 0) indicating no significant slowdown
    # allow for some variance but fail if there's a clear exponential trend
    # a slope > 0.1 seconds per point would indicate serious performance degradation
    assert slope < 0.1, f"Performance degradation detected: slope = {slope:.4f} seconds per point"

    # also check that no individual point took an unreasonably long time
    max_time = max(point_times)
    assert max_time < 5.0, f"Individual point took too long: {max_time:.2f} seconds"

    # use `-s` argument to pytest to view
    print("Performance test completed:")
    print(f"  Total points: {len(point_times)}")
    print(f"  Average time per point: {y_mean:.3f} seconds")
    print(f"  Max time per point: {max_time:.3f} seconds")
    print(f"  Performance slope: {slope:.6f} seconds per point")
