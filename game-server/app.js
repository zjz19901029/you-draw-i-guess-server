var pomelo = require('pomelo');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
var serversInfo = {};

app.set('serversInfo',serversInfo);
app.set('name', 'you-draw-i-guess');

// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.sioconnector,
      // 'websocket', 'polling-xhr', 'polling-jsonp', 'polling'
      transports : ['websocket', 'polling'],
      heartbeats : true,
      closeTimeout : 60 * 1000,
      heartbeatTimeout : 60 * 1000,
      heartbeatInterval : 25 * 1000
    });
});

var roomRoute = function(session, msg, app, cb) {
    var roomServers = app.getServersByType('room');

    if(!roomServers || roomServers.length === 0) {
        cb(new Error('can not find chat servers.'));
        return;
    }

    var id = "room-server-" + app.get("serverId").split("-")[2];

    cb(null, id);
};

app.configure('production|development', function() {
    // route configures
    app.route('room', roomRoute);

    // filter configures
    app.filter(pomelo.timeout());
});


// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
