import csv
from tempfile import NamedTemporaryFile
from flask import Flask, send_file
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
    schematic = db.Column(db.String, nullable=False)

db.create_all()

manager = APIManager(app, flask_sqlalchemy_db=db)

manager.create_api(Point, methods=['GET', 'POST', 'DELETE'])

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/export')
def export():
    points = Point.query.all()
    with NamedTemporaryFile('w+t', delete=False, suffix='.csv') as f:
        wr = csv.writer(f, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        [wr.writerow([getattr(record, column.name) for column in Point.__mapper__.columns]) for record in points]
        fname = f.name
    return send_file(fname, as_attachment=True)

if __name__ == '__main__':
    app.debug = True
    app.run()
