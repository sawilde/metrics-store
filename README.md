A simple node applcation with a mongodb backed storage. 

Used to capture metrics (initially for the purpose of OpenCover metrics) that can then be used for a dashboard.

#### HOSTING:

So as to not use the default/development username and password of *user:pwd* outside the development environment you should alter the following environment variables on your hosting site:
```
METRICS_USERNAME
METRICS_PASSWORD
```
e.g. for Heroku
```
heroku config:add METRICS_USERNAME=user --app <APPNAME>
heroku config:add METRICS_PASSWORD=pwd --app <APPNAME>
```
