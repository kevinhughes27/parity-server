import os

CURRENT_LEAGUE_ID = 22


def database_path():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, 'db.sqlite')

    if os.name == 'nt':
        return 'sqlite:///' + db_path
    else:
        return 'sqlite:////' + db_path


class Config(object):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = database_path()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # SQLALCHEMY_ECHO = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.sqlite'
