module.exports = function(app) {
	return new Handler(app);
};

const Handler = function(app) {
	this.app = app;

};

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.enterServer = function(msg, session, next) {
	const uid = msg.uid;
	var sessionService = this.app.get('sessionService');

	//duplicate log in
	if( !! sessionService.getByUid(uid)) {
		next(null, {
			code: 500,
			error: true,
			msg: '账号已在其他地方登录'
		});
		return;
	}
	session.bind(uid);
	session.set("name",msg.name);
	session.set("avatar",msg.avatar);
	session.push("name");
	session.push("avatar");

	var sid = this.app.get('serverId');

    session.on('closed', onUserLeave.bind(null, this.app));

    //put user into channel
    this.app.rpc.room.roomRemote.add(session, msg, sid, sid, true, function(data){
        next(null, {
            code:200
        });
    });
};

Handler.prototype.getServerInfo = function(msg, session, next) {
    var sid = this.app.get('serverId');
	this.app.rpc.room.roomRemote.getAllInfo(session, sid, function(data){
        next(null, {
            code:200,
            userList:data.userList,
            roomList:data.roomList
        });
    });
}



Handler.prototype.joinRoom = function(msg, session, next) {
    var sid = this.app.get('serverId');
	var app = this.app;
    //put user into channel
    app.rpc.room.roomRemote.add(session, msg.userInfo, sid, msg.rid, true, function(data){
    	if(data.code == 500){
            next(null, data);
            return;
		}
		session.set("rid",msg.rid);
    	session.push("rid");
        session.on('closed', onUserLeaveRoom.bind(null, app, msg.rid));
        next(null, {
            code:200,
            userList:data.userList
        });
    });
}

Handler.prototype.leaveRoom = function(msg, session) {
	var rid = session.get("rid");
    onUserLeaveRoom(this.app,rid,session);
}

Handler.prototype.beginGame = function(msg, session, next) {
    var sid = this.app.get('serverId');
    var rid = session.get("rid");
    this.app.rpc.room.roomRemote.beginGame(session,session.uid, rid, sid, function(data){
        next(null, data);
    });
}

Handler.prototype.getGameData = function(msg, session, next) {
    var rid = session.get("rid");
    this.app.rpc.room.roomRemote.getGameData(session, rid, function(data){
        next(null, data);
    });
}


/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
    if(!session || !session.uid) {
        return;
    }
    app.rpc.room.roomRemote.kick(session, session.uid, app.get('serverId'), app.get('serverId'), null);
};

var onUserLeaveRoom = function(app,rid, session) {
    if(!session || !session.uid) {
        return;
    }
    session.set("rid","");
    session.push("rid");
    app.rpc.room.roomRemote.kick(session, session.uid, app.get('serverId'), rid, null);
};
/**
 * Publish route for mqtt connector.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.publish = function(msg, session, next) {
	var result = {
		topic: 'publish',
		payload: JSON.stringify({
			code: 200,
			msg: 'publish message is ok.'
		})
	};
	next(null, result);
};

/**
 * Subscribe route for mqtt connector.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.subscribe = function(msg, session, next) {
	var result = {
		topic: 'subscribe',
		payload: JSON.stringify({
			code: 200,
			msg: 'subscribe message is ok.'
		})
	};
	next(null, result);
};