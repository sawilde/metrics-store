// common settings - use heroku environment variables then fallback to local dev settings
var port = process.env.PORT || 8888;
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/metrics-store'; 
  
var restify = require('restify');
var mongoose = require('mongoose');
 
// prep the mongo database connection
var mongoOptions = { db: { safe: true }};
mongoose.connect(mongoUri, mongoOptions, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + mongoUri + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + mongoUri);
  }
});

var server = restify.createServer({
  name: 'metrics-store',
  version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/echo/:name', function (req, res, next) {
  res.send(req.params);
  return next();
});

server.listen(port, function () {
  console.log('%s listening at %s', server.name, server.url);
});