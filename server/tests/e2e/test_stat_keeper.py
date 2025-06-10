from playwright.sync_api import Page, expect
import pytest
import re
import requests
import time

from server.api import CURRENT_LEAGUE_ID

# use `page.pause()` with `--headed` to pause and
# start the recorder. Then use the UI to make drive the test
# before copying the code back. select pytest for export


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args, playwright):
    return {"viewport": {"width": 768, "height": 900}, "is_mobile": True}


def start_stats_keeper(page: Page):
    page.goto("http://localhost:8000/stat_keeper")

    blank_slate = 'No games stored locally. Click "Start New Game" to begin.'
    expect(page.get_by_role("paragraph")).to_contain_text(blank_slate)

    page.get_by_role("button", name="Start New Game").click()
    expect(page.locator("h5")).to_contain_text("Create Game")


def select_teams(page: Page, home: str, away: str):
    # initial state
    expect(page.locator("h5")).to_contain_text("Create Game")
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


def submit_game(page: Page):
    open_hamburger_menu(page)
    page.once("dialog", lambda dialog: dialog.accept())
    page.get_by_role("menuitem", name="Submit game to server").click()

    # submitting the game doesn't redirect you anywhere right now...
    # page.get_by_role("link", name="StatKeeper Home").click()


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
    expect_players_disabled(page, [p for p in rosters[home] if p not in home_line])
    expect_players_disabled(page, [p for p in rosters[away] if p not in away_line])

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
    expect_players_enabled(page, [p for p in away_line if p != "Heather McCabe"])  # player with the disk is enabled

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
    # undo turnovers
    # undo point
    pass


def test_halftime(server, league, rosters, page: Page) -> None:
    # initial state (both teams enabled)
    # expect_players_enabled(page, home_line)
    # expect_players_enabled(page, away_line)

    # ensure we start up with a pull again
    # more detailed asserts on button "enabled" states here
    pass


def test_resume(server, league, rosters, page: Page) -> None:
    pass


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

    start_game(page)

    # there is a race here because we don't assert the browser went somewhere after
    time.sleep(1)

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
    # TODO this text is not correct when returning from edit rosters
    # expect_next_line_text(page)
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    select_lines(page, rosters[home][:5] + ["Kevin Hughes"], rosters[away][:6])
    expect_lines_selected(page, home, away)
    start_point(page)

    # TODO there is a bug here. The sub is selected but then they don't show on the line
    # if I add them again they do show up..?
    expect(page.get_by_role("button", name="Point!")).to_be_visible()
    expect(page.get_by_role("button", name="Kevin Hughes")).to_be_visible()


# test_edit_rosters_mid_point?
# and change line after?


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
    select_lines(page, rosters[home][:6], rosters[away][:6])
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

    # verify points played
    assert stats["Kevin Barford"]["points_played"] == 1
    # TODO this is 0 right now which is a bug. might be a bug in current app too but still should fix
    assert stats["Kyle Sprysa"]["points_played"] == 1

    # verify point
    game = get_game(1)
    assert "Kevin Barford" in game["points"][0]["offensePlayers"]
    assert "Kyle Sprysa" in game["points"][0]["offensePlayers"]  # this is also not working which makes sense
