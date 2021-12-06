import os

def development_database_path():
    use_postgres = True

    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, 'db.sqlite')

    if use_postgres:
        return "postgres://postgres:postgres@localhost:5432/"
    elif os.name == 'nt':
        return 'sqlite:///' + db_path
    else:
        return 'sqlite:////' + db_path


class Config(object):
    DEBUG = False
    TESTING = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')


class DevelopmentConfig(Config):
    DEVELOPMENT = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = development_database_path()
    # SQLALCHEMY_ECHO = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.sqlite'
