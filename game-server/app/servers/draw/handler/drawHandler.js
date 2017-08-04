const chatRemote = require('../remote/drawRemote');

module.exports = function(app) {
	return new Handler(app);
};

const Handler = function(app) {
	this.app = app;
};

let handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.send = function(msg, session, next) {
	const rid = session.get('rid');
	const username = session.uid.split('*')[0];
	const channelService = this.app.get('channelService');
	let param = {
		msg: msg.content,
		from: username,
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
		route: msg.route
	});
};