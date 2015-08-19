import csv
import os
from tempfile import NamedTemporaryFile

from flask import Flask, send_file
from flask.ext.restless import APIManager
from flask.ext.sqlalchemy import SQLAlchemy

app = Flask(__name__, static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))


class Schematic(db.Model):
    __tablename__ = 'schematics'
    id = db.Column(db.Integer, primary_key=True)
    schematic = db.Column(db.String, nullable=False)
    color = db.Column(db.String, nullable=False)
    radius = db.Column(db.Integer, nullable=False)


class Point(db.Model):
    __tablename__ = 'datapoints'
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    long = db.Column(db.Float, nullable=False)
    type = db.Column(db.String, nullable=False)


db.create_all()

manager = APIManager(app, flask_sqlalchemy_db=db)
manager.create_api(Point, methods=['GET', 'POST', 'DELETE'], results_per_page=0)
manager.create_api(Schematic, methods=['GET', 'POST'], results_per_page=0)


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/js/<path:path>')
def send_js(path):
    return app.send_static_file(os.path.join('js', path).replace('\\', '/')), 200


@app.route('/css/<path:path>')
def send_css(path):
    return app.send_static_file(os.path.join('css', path).replace('\\', '/')), 200


@app.route('/export')
def export():
    points = Point.query.all()
    with NamedTemporaryFile('w+t', delete=False, suffix='.csv') as f:
        wr = csv.writer(f, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        wr.writerow(['lat', 'long', 'type'])
        [wr.writerow([getattr(record, column.name) for column in Point.__mapper__.columns if column.name != 'id']) for
         record in points]
        fname = f.name
    return send_file(fname, as_attachment=True)


if __name__ == '__main__':
    app.debug = True
    app.run()
