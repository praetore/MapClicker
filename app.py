import csv
from tempfile import NamedTemporaryFile

from flask import Flask, send_file
from flask.ext.restful import Resource, Api
from flask.ext.restless import APIManager
from flask.ext.sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
api = Api(app)
db = SQLAlchemy(app)


class Schematic(Resource):
    def __init__(self):
        super().__init__()
        with open('options.csv', 'r') as f:
            reader = csv.reader(f)
            self.schematicfiles = [{'type': row[0], 'color': row[1], 'radius': row[2]} for row in reader]

    def get(self):
        return {
            'num_results': len(self.schematicfiles),
            'objects': self.schematicfiles
        }


class Point(db.Model):
    __tablename__ = 'datapoints'
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    long = db.Column(db.Float, nullable=False)
    type = db.Column(db.String, nullable=False)


db.create_all()

api.add_resource(Schematic, '/api/schematics')

manager = APIManager(app, flask_sqlalchemy_db=db)
manager.create_api(Point, methods=['GET', 'POST', 'DELETE'], results_per_page=0)


@app.route('/')
def index():
    return app.send_static_file('index.html')


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
