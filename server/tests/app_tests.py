import time
from flask_testing import TestCase as FlaskTest
from flask_testing import LiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from urllib.request import urlopen

from models import db
from .test_base import TestBase


class AppTests(TestBase, FlaskTest, LiveServerTestCase):
    def setUp(self):
        db.create_all()
        self.init_league(league_id=15)
        self.create_rosters(league_id=15)
        self.upload_game('mini_game.json', league_id=15)
        self.upload_game('mini_game2.json', league_id=15)

        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(2)
        self.driver.get(self.get_server_url())

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.driver.quit()

    def test_stats_page(self):
        response = urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)
        assert "Parity 2.0" in self.driver.title

        # content
        player_name = "Jim Robinson"
        row = self.driver.find_element_by_xpath("//div[text()='%s']/ancestor::tr" % player_name)
        stats = row.text.split("\n")
        self.assertEqual(stats[2], '1')  # goal

        # search
        self.driver.find_element_by_xpath("//div[@data-test-id='Search']/input").send_keys("Keates")
        table = self.driver.find_elements(By.TAG_NAME, "tbody")[0]
        rows = table.find_elements(By.TAG_NAME, "tr")
        assert len(rows) == 1
        stats = rows[0].text.split("\n")
        self.assertEqual(stats[2], '2')  # goal

        # clear search
        while self.driver.find_element_by_xpath("//div[@data-test-id='Search']/input").get_attribute('value') != "":
            self.driver.find_element_by_xpath("//div[@data-test-id='Search']/input").send_keys(Keys.BACK_SPACE)
        table = self.driver.find_elements(By.TAG_NAME, "tbody")[0]
        rows = table.find_elements(By.TAG_NAME, "tr")
        self.assertEqual(len(rows), 48)

        # sort by assists
        self.driver.find_element_by_xpath("//*[@data-testid='headcol-3']").click()
        table = self.driver.find_elements(By.TAG_NAME, "tbody")[0]
        row = table.find_elements(By.TAG_NAME, "tr")[0]
        stats = row.text.split("\n")
        self.assertEqual(stats[0], 'Jessie Robinson')
        self.assertEqual(stats[3], '1')  # assists

    def test_games_page(self):
        response = urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)

        # navigate to games page
        self.driver.find_element_by_id("side-bar").click()
        self.driver.find_element_by_link_text("Games").click()

        # games page loaded
        assert "/games" in self.driver.current_url
        assert "Week 1" in self.driver.page_source

        # navigate to game
        self.driver.find_element_by_partial_link_text("Kells Angels Bicycle Club").click()
        assert "/games/1" in self.driver.current_url

        # expand points
        assert "Brian Kells pulled" not in self.driver.page_source
        self.driver.find_element_by_xpath("//button[text()='Expand All ']").click()
        assert "Brian Kells pulled" in self.driver.page_source

    def test_teams_page(self):
        response = urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)

        # navigate to teams page
        self.driver.find_element_by_id("side-bar").click()
        self.driver.find_element_by_link_text("Team Dashboard").click()
        time.sleep(0.5)

        assert "/team_dashboard" in self.driver.current_url
        assert "Team Cap Space" in self.driver.page_source
