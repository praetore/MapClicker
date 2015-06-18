from flask import Flask
from flask.ext.restless import APIManager
from flask.ext.sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///points.db'
db = SQLAlchemy(app)

class Point(db.Model):
    __tablename__ = 'datapoints'
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    long = db.Column(db.Float, nullable=False)
    schematic = db.Column(db.String)

db.create_all()

manager = APIManager(app, flask_sqlalchemy_db=db)

manager.create_api(Point, methods=['GET', 'POST'])

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run()
