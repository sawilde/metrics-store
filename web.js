// common settings - use heroku environment variables then fallback to local dev settings
var port = process.env.PORT || 8888;
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/metrics-store'; 

var username = process.env.METRICS_USERNAME || 'user';
var password = process.env.METRICS_PASSWORD || 'pwd';
  
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

var valueSchema = new mongoose.Schema({
  value: { type: Number },
  date: { type: Date }
});

valueSchema.methods.toJSON = function() {
  obj = this.toObject();
  delete obj._id;
  return obj;
};

var metricSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  values: [ valueSchema ]
});

metricSchema.methods.toJSON = function() {
  obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  for (var i=0, value; value = obj.values[i]; i++) {
    delete value._id;
  }
  return obj;
};

// register schema
var Metric = mongoose.model('Metrics', metricSchema);

function postMetricValue(req, res, next) {
  Metric.findOne({ 'name': req.params['name'] }, function (err, metric) {
    
	if (!metric){
	  metric = new Metric ({
        name: req.params['name']
      })
      metric.save();	
	} 
	
	var value = metric.values.create({
	  value: req.params['value'],
      date: req.params['date'] || new Date
	});
	metric.values.push(value);

	metric.save(function () {
	  res.send(201, value);
	});
  });
}

function getMetric(req, res, next) {
  Metric.findOne({ 'name': req.params['name'] }, function (err, metric) {
    if (!metric) {
	  res.send(404);
      return next();
	}
    res.send(metric);
  });
}

function deleteMetrics(req, res, next) {
  Metric.remove(function() {
    res.send(204);
    return next();
  });
}

function deleteMetric(req, res, next) {
  Metric.find({ 'name': req.params['name'] }).remove(function() {
    res.send(204);
    return next();
  });
}

// initialise server
var server = restify.createServer({
  name: 'metrics-store',
  version: '0.0.1'
});

function authenticate(req, res, next) {
    if (req.method === 'GET') return next();
    var authz = req.authorization;
    if (authz.scheme !== 'Basic' ||
        authz.basic.username !== username ||
        authz.basic.password !== password) {
        return next(new restify.NotAuthorizedError('failed to authenticate'));
    }
    return next();
}

server.use(restify.acceptParser(server.acceptable));
server.use(restify.CORS());
server.use(restify.authorizationParser());
server.use(authenticate);
server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());

// prep end points
server.post('/metrics/:name/value', postMetricValue);
server.get('/metrics/:name', getMetric);
server.del('/metrics', deleteMetrics);
server.del('/metrics/:name', deleteMetric);

server.listen(port, function () {
  console.log('%s listening at %s', server.name, server.url);
});