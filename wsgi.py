#!/usr/bin/env python
import os

virtenv = os.environ['OPENSHIFT_PYTHON_DIR'] + '/virtenv/'
virtualenv = os.path.join(virtenv, 'bin/activate_this.py')
try:
    execfile(virtualenv, dict(__file__=virtualenv))
except IOError:
    pass

from app import app as application

if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    host = os.environ.get('OPENSHIFT_PYTHON_IP', 'localhost')
    port = os.environ.get('OPENSHIFT_PYTHON_PORT', 8080)
    httpd = make_server(host, port, application)
    # Wait for a single request, serve it and quit.
    httpd.handle_request()
