from flask.ext.script import Manager
from app import app, db

manager = Manager(app)


@manager.command
def drop():
    db.drop_all()


@manager.command
def create():
    db.create_all()


if __name__ == "__main__":
    manager.run()
