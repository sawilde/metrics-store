// common settings - use environment variables then fallback to default settings
var port = process.env.PORT || 8888;
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/metrics-store'; 

var username = process.env.METRICS_USERNAME || 'user';
var password = process.env.METRICS_PASSWORD || 'pwd';
  
var restify = require('restify');
var mongoose = require('mongoose'), Schema = mongoose.Schema;
 
// prep the mongo database connection
var mongoOptions = { db: { safe: true }};
mongoose.connect(mongoUri, mongoOptions, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + mongoUri + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + mongoUri);
  }
});

// build the schemas
var valueSchema = new Schema({
  metric: { type: Schema.Types.ObjectId, ref: 'Metric', index:true},
  value: { type: Number },
  date: { type: Date }
});

valueSchema.methods.toJSON = function() {
  obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  delete obj.metric;
  return obj;
};

var metricSchema = new Schema({
  name: { type: String, trim: true },
  values: [{ type: Schema.Types.ObjectId, ref: 'Value' }] 
});

metricSchema.pre('remove', function(next) {
    Value.remove({metric: this._id}).exec();
    next();
});

metricSchema.methods.toJSON = function() {
  obj = this.toObject();
  delete obj._id;
  delete obj.__v;
  for (var i=0, value; value = obj.values[i]; i++) {
    delete value._id;
    delete value.__v;
    delete value.metric;
  }
  return obj;
};
 
// register schema
var Value = mongoose.model('Value', valueSchema);
var Metric = mongoose.model('Metric', metricSchema);

// API handlers
function postMetricValue(req, res, next) {
  Metric.findOne({ 'name': req.params['name'] }, function (err, metric) {

    metric = metric || new Metric ({
          name: req.params['name']
        });
    
    var value = new Value({
      value: req.params['value'],
        date: req.params['date'] || new Date
    });
    
    value.save(function(){
      metric.values.push(value);
      metric.save(function () {
        res.send(201, value);
      });
    });	
  });
}

function getMetric(req, res, next) {
  var when = new Date;
  when.setDate(when.getDate()-21);
  Metric.findOne({ 'name': req.params['name'] }).populate('values', null, { date: { $gte: when }}).exec(function (err, metric) {
    if (!metric) {
      res.send(404);
      return next();
    }
    res.send(metric);
  });
}

function deleteMetrics(req, res, next) {
  Metric.remove(function() {
    Value.remove(function() {
      res.send(204);
      return next();
    });
  });
}

function deleteMetric(req, res, next) {
  Metric.findOne({ 'name': req.params['name'] }, function(err, metric){
    metric.remove(function() { // we need to use this method so that the pre-hook will work
      res.send(204);
      return next();
    });
  });
}

// initialise restify server
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

// expose end points
server.post('/metrics/:name/value', postMetricValue);
server.get('/metrics/:name', getMetric);
server.del('/metrics', deleteMetrics);
server.del('/metrics/:name', deleteMetric);

server.listen(port, function () {
  console.log('%s listening at %s', server.name, server.url);
});