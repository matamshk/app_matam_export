import sys
import os

# Insert the app path to system path
sys.path.insert(0, os.path.dirname(__file__))

# Import the flask app. Passenger expects the callable to be named 'application'.
from flask_app import app as application
