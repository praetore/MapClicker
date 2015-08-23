import ast
import csv
import os
from tempfile import NamedTemporaryFile

from flask import Flask, send_file, jsonify
from flask.ext.restful import Api, Resource, reqparse
from flask.ext.restless import APIManager
from flask.ext.sqlalchemy import SQLAlchemy

app = Flask(__name__, static_url_path='')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')

db = SQLAlchemy(app)
parser = reqparse.RequestParser()
parser.add_argument("objects", action='append')

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
    lng = db.Column(db.Float, nullable=False)
    type = db.Column(db.String, nullable=False)

    def __init__(self, lat, lng, type):
        self.lat = lat
        self.lng = lng
        self.type = type


class MultiPointsHandler(Resource):
    def post(self):
        args = parser.parse_args()
        points = args["objects"]

        for i in points:
            d = ast.literal_eval(i)
            point = Point(d["lat"], d["lng"], d["type"])
            db.session.add(point)
        db.session.commit()

        res_points = Point.query\
            .order_by(Point.id.desc())\
            .limit(len(points))\
            .all()

        res = {
            "num_results": len(points),
            "objects": list(reversed([
                {
                    "id": point.id,
                    "lat": point.lat,
                    "lng": point.lng,
                    "type": point.type
                }
                for point in res_points
                ]))
        }
        return jsonify(res)

    def delete(self):
        args = parser.parse_args()
        points = args["objects"]
        for i in points:
            d = ast.literal_eval(i)
            point = Point.query.get(d["id"])
            db.session.delete(point)
        db.session.commit()

db.create_all()

manager = APIManager(app, flask_sqlalchemy_db=db)
manager.create_api(Point, methods=['GET', 'POST', 'DELETE'], results_per_page=0)
manager.create_api(Schematic, methods=['GET', 'POST', 'PUT', 'DELETE'], results_per_page=0)
api = Api(app)
api.add_resource(MultiPointsHandler, '/api/multihandler')


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
    app.run()
