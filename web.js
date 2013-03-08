var http = require("http");

var port = process.env.PORT || 8888;

http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.write("Hello World Shaun");
  response.end();
}).listen(port);