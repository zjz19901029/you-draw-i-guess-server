const roomRemote = require('../remote/roomRemote');

module.exports = function(app) {
	return new Handler(app);
};

const Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.sendMsg = function(msg, session, next) {
	const rid = session.get('rid');
	const uid = session.uid;
	const username = session.get('name');
	const channelService = this.app.get('channelService');
	var param = {
		msg: msg.content,
		from: {
			uid: uid,
			username: username
		},
		target: msg.target
	};
	channel = channelService.getChannel(rid, false);

	//the target is all users
	if(msg.target == '*') {
		channel.pushMessage('onChat', param);
	}
	//the target is specific user
	else {
		const tuid = msg.target + '*' + rid;
		const tsid = channel.getMember(tuid)['sid'];
		channelService.pushMessageByUids('onChat', param, [{
			uid: tuid,
			sid: tsid
		}]);
	}
	next(null, {
		code:200,
		route: msg.route
	});
};

