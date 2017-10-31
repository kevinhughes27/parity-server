from app import db, create_app
import os

if os.environ.get('APP_SETTINGS') == None:
    os.environ['APP_SETTINGS'] = 'config.DevelopmentConfig'

app = create_app()

with app.app_context():
    db.create_all()
