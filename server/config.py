import os

CURRENT_LEAGUE_ID = 22

STAT_VALUES = {
    "v2": {
        "goals": 10000,
        "assists": 10000,
        "second_assists": 8000,
        "d_blocks": 8000,
        "throw_aways": -5000,
        "threw_drops": -1000,
        "drops": -4000,
        "completions": 500,
        "catches": 500,
        "o_points_for": 1000,
        "d_points_for": 2000,
    },
    "v1": {
        "goals": 10000,
        "assists": 10000,
        "second_assists": 8000,
        "d_blocks": 8000,
        "throw_aways": -5000,
        "threw_drops": -2500,
        "drops": -5000,
        "completions": 1000,
        "catches": 1000,
    },
}


def database_path():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, "db.sqlite")

    if os.name == "nt":
        return "sqlite:///" + db_path
    else:
        return "sqlite:////" + db_path


class Config(object):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = database_path()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # SQLALCHEMY_ECHO = True
