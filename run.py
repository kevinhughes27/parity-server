from server.app import app
from server.models import db

# boot server for development
if __name__ == '__main__':

    # auto create development database
    if app.config.get('DEVELOPMENT'):
        with app.app_context():
            db.create_all()

    app.run(use_reloader=True)
