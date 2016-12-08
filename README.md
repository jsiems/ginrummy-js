# ginrummy-js
Javascript application for playing gin rummy over the web

# usage
Your main server file should look like this:
'''javascript
var express = require('express');
var app = express();
var path = require('path');
var WebSocketServer = require('ws').Server;
var ginrummy = require('./code/ginrummy-js/server/ginrummy');

app.use('/ginrummy', express.static(__dirname + '/code/ginrummy-js/client'));

app.get('/ginrummy', function(req, res) {
  res.sendFile(path.join(__dirname, 'code/ginrummy-js/client', 'ginrummy.html'));
  console.log("Get request for ginrummy");
});

var server = app.listen(80, '192.168.1.131', function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log("example app listening at http://%s:%s", host, port);
});

var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
  if(ws.protocol == 'ginrummy') {
    ginrummy.addClient(ws);
  }
});
'''
