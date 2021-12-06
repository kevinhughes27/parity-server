from flask_testing import TestCase as FlaskTest
from flask_testing import LiveServerTestCase
from selenium import webdriver
from urllib.request import urlopen

from .test_base import TestBase
from server.models import db

class FrontendTests(TestBase, FlaskTest, LiveServerTestCase):
    def setUp(self):
        db.create_all()
        self.init_league(league_id=15)
        self.upload_game('mini_game.json', league_id=15)

        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(2)
        self.driver.get(self.get_server_url())

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.driver.quit()

    def test_stats(self):
        response = urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)
        assert "Parity 2.0" in self.driver.title

        player_name = "Jim Robinson"
        row = self.driver.find_element_by_xpath("//div[text()='%s']/ancestor::tr" % player_name)
        stats = row.text.split("\n")
        assert stats[2] == '1' # 1 goal

    def test_search(self):
        pass

    def test_nav(self):
        pass
