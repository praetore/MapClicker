# MapClicker
This webapp saves coordinates from Google Maps

Used to export coordinates for importing the buildings of the Rotterdam harbour 
into Minecraft.

Tested and working on Python 3. It is meant for deployment on Heroku, but if you want to use it locally, 
remove or comment out *psycopg2* in *requirements.txt* before installation.

# How to use
Either deploy this to Heroku using a Python 3 and PostgreSQL database setup, or to run locally:

    pip install -r requirements.txt
    python app.py
Voila! Open your browser and go to http://127.0.0.1:5000/ to index your new coordinates.
