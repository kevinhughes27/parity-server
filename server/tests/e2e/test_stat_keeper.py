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


def select_lines(page: Page, home_line: list[str], away_line: list[str]):
    for player in home_line:
        page.get_by_role("button", name=player).click()
    for player in away_line:
        page.get_by_role("button", name=player).click()


def expect_lines_selected(page: Page, home: str, away: str):
    expect(page.locator("#root")).to_contain_text(f"{home} (6/6)")
    expect(page.locator("#root")).to_contain_text(f"{away} (6/6)")


def submit_game(page: Page):
    page.get_by_role("button").filter(has_text=re.compile(r"^$")).click()
    page.once("dialog", lambda dialog: dialog.dismiss())
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
    page.get_by_role("button", name="Start").click()

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
    page.get_by_role("button", name="Start Point").click()

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

    # submit
    submit_game(page)

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

    page.get_by_role("button", name="Start").click()

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
    page.get_by_role("button", name="Start").click()

    # select lines
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    select_lines(page, rosters[home][:6], rosters[away][:6])
    expect_lines_selected(page, home, away)
    page.get_by_role("button", name="Start Point").click()

    # record stats
    page.get_by_role("button", name="Brian Kells").click()
    page.get_by_role("button", name="Pull").click()
    page.get_by_role("button", name="Owen Lumley").click()
    page.get_by_role("button", name="Heather McCabe").click()
    page.get_by_role("button", name="Kevin Barford").click()
    page.get_by_role("button", name="Point!").click()

    # edit rosters
    page.get_by_role("button").filter(has_text=re.compile(r"^$")).click()
    page.get_by_role("menuitem", name="Edit Rosters").click()

    # add sub
    page.get_by_role("textbox", name="Substitute name").first.click()
    page.get_by_role("textbox", name="Substitute name").first.fill("Kevin Hughes")
    page.get_by_role("button", name="Add Sub").first.click()
    page.get_by_role("button", name="Update Rosters").click()

    # select lines
    # TODO this text is not correct when returning from edit rosters
    expect(page.locator("#root")).to_contain_text("Select players for the first point.")
    select_lines(page, rosters[home][:5] + ["Kevin Hughes"], rosters[away][:6])
    expect_lines_selected(page, home, away)
    page.get_by_role("button", name="Start Point").click()

    # TODO there is a bug here. The sub is selected but then they don't show on the line
    # if I add them again they do show up..?
    expect(page.get_by_role("button", name="Point!")).to_be_visible()
    expect(page.get_by_role("button", name="Kevin Hughes")).to_be_visible()


def test_change_line_mid_point(server, league, rosters, page: Page) -> None:
    # assert on points played. call out issue with old player being removed or whatever actually happens
    pass


def test_turnovers(server, league, rosters, page: Page) -> None:
    # assert when buttons are enabled and not
    pass


def test_undo(server, league, rosters, page: Page) -> None:
    # undo turnovers
    # undo point
    pass


def test_halftime(server, league, rosters, page: Page) -> None:
    # ensure we start up with a pull again
    # more detailed asserts on button "enabled" states here
    pass


def test_resume(server, league, rosters, page: Page) -> None:
    pass
