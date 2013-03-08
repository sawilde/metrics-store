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

var metricSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  value: { type: Number },
  date: { type: Date }
});

// hide fields from json
metricSchema.methods.toJSON = function() {
  obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  return obj;
};

// register schema
var Metric = mongoose.model('Metrics', metricSchema);
/*
Metric.remove({}, function(err) {
  if (err) {
    console.log ('error deleting old data.');
  }
});

var test = new Metric ({
  name: 'OpenCover_Coverage',
  value: 94.57,
  date: new Date
});

test.save (function (err) { if (err) console.log ('Error on save!') });
*/

function postMetric(req, res, next) {
  var metric = new Metric ({
    name: req.params['name'],
    value: req.params['value'],
    date: req.params['date'] || new Date
  });
  metric.save(function () {
    res.send(req.body);
  });
}

function getMetrics(req, res, next) {
  Metric.find().sort('-date').execFind(function (arr,data) {
    res.send(data);
  });
}
// initialise server
var server = restify.createServer({
  name: 'metrics-store',
  version: '0.0.1'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

// prep end points
server.post('/metrics', postMetric);
server.get('/metrics', getMetrics);

server.listen(port, function () {
  console.log('%s listening at %s', server.name, server.url);
});