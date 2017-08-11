const roomRemote = require('../remote/roomRemote');
var COMMON = require('../common/common');

var scoreCount = {
    1:3,
    2:2,
    3:1
};

module.exports = function(app) {
	return new Handler(app);
};

const Handler = function(app) {
	this.app = app;
    this.roomRemote = roomRemote(app);
    this.roomList = COMMON.roomList;
    this.gameData = COMMON.gameData;
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
    if(this.roomList[rid].state == 1){
        var score;
        if(score = this.judgeAnswer(param, rid, uid)){
            param.answerRight = true;
            param.score = score;
        }
    }

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

handler.judgeAnswer = function(param, rid, uid){//判断答案正确
    var gameData = this.gameData[rid];
    var score = 0;
    var currentPlayer = gameData.players[gameData.currentPlayer];
    if(param.msg.trim() == gameData.answer.word){//答案正确
        param.msg = '****';//将答案屏蔽
        if(this.roomList[rid].state == 1 && currentPlayer.uid != uid && !gameData.answerRightUser[uid]){//正在游戏中，且当前用户不是画画者，判断是否猜对
            gameData.answerRightUser[uid] = true;
            gameData.answerRightNum++;
            score = gameData.answerRightNum>3?scoreCount[3]:scoreCount[gameData.answerRightNum];
            currentPlayer.score++;
            var me = gameData.players.find(p => {
               return p.uid == uid;
            });
            me.score += score;
            const channelService = this.app.get('channelService');
            channel = channelService.getChannel(rid, false);
            channel.pushMessage('onAnswerRight', {
                [uid]:me.score,
                [currentPlayer.uid]:currentPlayer.score
            });
            var onlineUser = 0;
            gameData.players.forEach(p => {
               if(!p.isOffline&&p.uid != currentPlayer.uid){
                   onlineUser++;
                }
            });
            if(gameData.answerRightNum == onlineUser){//所有人答对
                this.roomRemote.toNextPlayer(rid,gameData);
            }
            return score;
        }else{
            return false;
        }
    }
    return false;
};


handler.drawAction = function(msg, session, next){
    const rid = session.get('rid');
    const channelService = this.app.get('channelService');
    const channel = channelService.getChannel(rid, false);
    channel.pushMessage('onDrawAction', msg);
};

handler.drawImage = function(msg, session, next){
    const rid = session.get('rid');
    const channelService = this.app.get('channelService');
    const channel = channelService.getChannel(rid, false);
    channel.pushMessage('onDrawImage', msg);
};