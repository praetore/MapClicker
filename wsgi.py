#!/usr/bin/env python
import os
import imp

virtenv = os.environ['OPENSHIFT_PYTHON_DIR'] + '/virtenv/'
virtualenv = os.path.join(virtenv, 'bin/activate_this.py')
try:
    execfile(virtualenv, dict(__file__=virtualenv))
except IOError:
    pass


def run_gevent_server(app, ip, port=8080):
    from gevent.pywsgi import WSGIServer
    WSGIServer((ip, port), app).serve_forever()


def run_simple_httpd_server(app, ip, port=8080):
    from wsgiref.simple_server import make_server
    make_server(ip, port, app).serve_forever()


from app import app as application

if __name__ == '__main__':
    ip = os.environ.get('OPENSHIFT_PYTHON_IP')
    port = os.environ.get('OPENSHIFT_PYTHON_PORT')
    zapp = imp.load_source('application', 'wsgi/application')

    try:
        run_gevent_server(application, ip, port)
    except:
        run_simple_httpd_server(zapp.application, ip, port)
