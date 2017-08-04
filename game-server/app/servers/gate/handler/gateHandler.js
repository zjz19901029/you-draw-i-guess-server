const dispatcher = require("../../../util/util");

module.exports = function(app) {
	return new Handler(app);
};

const Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
handler.queryEntry = function(msg, session, next) {

    var serversInfo = this.app.get('serversInfo');
	// get all connectors
	const connectors = this.app.getServersByType('connector');
    if(!connectors || connectors.length === 0) {
        next(null, {
            code: 500
        });
        return;
    }
    connectors.forEach(function(connector){
    	if(!serversInfo[connector.id]){
            serversInfo[connector.id] = {
            	id:connector.id,
                name:connector.name,
                maxUser:connector.maxuser,
                host:connector.host,
                port:connector.clientPort,
                onlineUser:0,
                state:1
            }
		}
        connector.onlineUser = serversInfo[connector.id].onlineUser;
    });

	this.app.set("serversInfo",serversInfo);


	//const res = dispatcher.dispatch(uid, connectors);
	next(null, {
		code: 200,
		serversInfo: connectors
		/*host: res.host,
		port: res.clientPort*/
	});
};
