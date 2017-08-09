var fs = require('fs');
var path = require('path');
var COMMON = require('../common/common');

module.exports = function(app) {
	return new RoomRemote(app);
};

var RoomRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
	this.roomList = COMMON.roomList;
	this.userInfo = COMMON.userInfo;
	this.timeCounts = COMMON.timeCounts;
	this.gameData = COMMON.gameData;
};

var wordConfig = [
    {type:"动物",file:"animal.json"},
    {type:"成语",file:"chengyu.json"},
    {type:"日常用品",file:"dailyuse.json"},
    {type:"食物",file:"food.json"},
    {type:"运动",file:"sport.json"}
]

var gameTime = 60;

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
RoomRemote.prototype.add = function(user, sid, name, flag, cb) {
	if(this.roomList.length == 0){//初始化各房间数据
        var serverId = this.app.get('serverId');
        var connector = this.app.getServerById(serverId);
        var roomsNum = connector.rooms;
        for(var i = 0;i<roomsNum;i++){
            this.roomList[i] = {
                sid:sid,
                players:[],
                maxPlayer:6,
                state:0  //0：未开始，1：游戏中
            };
        }
	}

	var isServer = sid == name?true:false;

	if(!isServer){
	    if(this.roomList[name].state == 1){
	        cb({
                code:500,
                error:2,
                msg:'游戏已经开始'
            })
            return;
        }
        if(this.roomList[name].players.length == this.roomList[name].maxPlayer){
            cb({
                code:500,
                error:1,
                msg:'该房间已经人满'
            })
            return;
        }
    }

    var channel = this.channelService.getChannel(name, flag);
    if( !! channel) {
        var data = {
            code:200
        };
        var param = {
            route: isServer?'onServerAdd':'onAdd',
            user: user
        };
        channel.pushMessage(param);
        channel.add(user.uid, sid);
        if(!isServer){//通知大厅所有人
            var channelServer = this.channelService.getChannel(sid, false);
            if( !! channelServer){
                channelServer.pushMessage({
                    route: 'onRoomAdd',
                    user: user,
                    roomId: name
                });
            }
            user.score = 0;//初始化分数
            this.roomList[name].players.push(user);
            data.userList = this.get(name, false);
        }

        this.userInfo[user.uid] = user;

        cb(data);
	}else{
	    cb({
            code:500,
            error:0,
            msg:'创建房间失败'
        })
    }
};

RoomRemote.prototype.getAllInfo = function(sid,cb) {
    cb({
        code: 200,
        userList: this.get(sid, false),
        roomList: this.roomList
    });
}

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
RoomRemote.prototype.get = function(name, flag) {
	var users = [];
	var channel = this.channelService.getChannel(name, flag);
	if( !! channel) {
		users = channel.getMembers();
	}
	for(var i =0;i<users.length;i++){
		if(this.userInfo[users[i]]){
			users[i] = this.userInfo[users[i]];
		}else{
            users[i] = {uid:users[i]};
		}
	}
	return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
RoomRemote.prototype.kick = function(uid, sid, name) {
	var channel = this.channelService.getChannel(name, false);
	var isServer = sid==name?true:false;
	// leave channel
	if( !! channel) {
		channel.leave(uid, sid);
	}
	var user = {uid:uid};
	if(this.userInfo[uid]){
        user = this.userInfo[uid]
	}
	if(!isServer){
        var channelServer = this.channelService.getChannel(sid, false);
        if( !! channelServer){
            channelServer.pushMessage({
                route: 'onRoomLeave',
                user: user,
                roomId: name
            });
        }
        !! channel&&channel.pushMessage({
            route: 'onLeave',
            user:user
        });

        var index = this.roomList[name].players.findIndex(function(player){
            return player.uid == uid;
        });
        this.roomList[name].players.splice(index,1);
    }else{
        !! channel&&channel.pushMessage({
            route: 'onServerLeave',
            user: user
        });
        delete this.userInfo[uid];
    }
};

//开始游戏初始化
RoomRemote.prototype.beginGame = function(uid,rid,sid,cb) {
    if(!rid || !this.roomList[rid]){
        cb({
            code: 500,
            error: 1,
            msg: '房间不存在'
        });
        return;
    }
    if(this.roomList[rid].players.length<2){
        cb({
            code: 500,
            error: 2,
            msg: '玩家人数不够'
        });
        return;
    }
    if(this.roomList[rid].players[0].uid != uid){
        cb({
            code: 500,
            error: 3,
            msg: '您不是房主，不能开始游戏'
        });
        return;
    }
    this.roomList[rid].state = 1;
    var channelServer = this.channelService.getChannel(sid, false);
    if( !! channelServer){//通知大厅更改房间状态
        channelServer.pushMessage({
            route: 'onRoomStart',
            roomId: rid
        });
    }

    this.startGame(rid,0);
    var channel = this.channelService.getChannel(rid, false);
    if( !! channel){
        channel.pushMessage({
            route: 'onGameBegin'
        });
    }
    cb({
        code: 200
    });
    return;
};

//获取随机题目
function getAnswer(){
    var length = wordConfig.length;
    var index = Math.floor(Math.random()*length);
    var filePath = path.join(__dirname,'../../../../config/answers/' + wordConfig[index].file);
    var result = JSON.parse(fs.readFileSync(filePath));
    var answerIndex = Math.floor(Math.random()*result.length);
    var answer = result[answerIndex];
    return {
        type: wordConfig[index].type,
        word: answer
    }
};

//开始游戏逻辑
RoomRemote.prototype.startGame = function(rid,index){
    var room = this.roomList[rid];

    this.gameData[rid] = {
        players: room.players,
        currentPlayer: index,
        time: gameTime,
        gameTime: gameTime,
        imageData: '',
        currentTimes: 1,//当前轮数，一共2轮
        answerRightNum: 0,//当前答对的人数
        answer: getAnswer()
    };
    this.startCountTime(rid,this.gameData[rid]);
};

//获取游戏数据
RoomRemote.prototype.getGameData = function(rid,cb){
    if(this.gameData[rid]){
        cb({
            code:200,
            gameData:this.gameData[rid]
        })
    }else{
        cb({
            code:500,
            error:1,
            msg:"游戏已结束"
        })
    }
};

//开始游戏倒计时
RoomRemote.prototype.startCountTime = function(rid,currentGameData){
    var channel = this.channelService.getChannel(rid, false);
    var self = this;
    this.timeCounts[rid] = setTimeout(function(){
        var notOffLineNum = 0;
        currentGameData.players.forEach(function(p) {
            if (self.roomList[rid].players.find(function (e) {
                    return e.uid == p.uid;
                })) {
                p.isOffline = false;
            } else {
                p.isOffline = true;
            }
            if (!p.isOffline) {
                notOffLineNum++;
            }
        });
        if(notOffLineNum<2){//少于2人的时候 直接结束游戏
            self.gameOver(rid,currentGameData);
            return;
        }
        if(currentGameData.players[currentGameData.currentPlayer].isOffline){//当前画画用户离线，直接跳过
            self.toNextPlayer(rid,currentGameData);
            return;
        }
        if(currentGameData.time > 0&&!currentGameData.players[currentGameData.currentPlayer].isOffline){
            currentGameData.time--;
            if(currentGameData.gameTime/2 >= currentGameData.time){
                if( !! channel) {
                    channel.pushMessage({
                        route: 'onAnswerType',
                        type: currentGameData.answer.type
                    });
                }
            }
            channel.pushMessage({
                route: 'onTimeout',
                time: currentGameData.time
            });
            self.startCountTime(rid,currentGameData);
        } else {
            self.toNextPlayer(rid,currentGameData);
        }
    },1000)
};

//下一个玩家
RoomRemote.prototype.toNextPlayer = function(rid,currentGameData){
    this.timeCounts[rid]&&clearTimeout(this.timeCounts[rid]);
    var channel = this.channelService.getChannel(rid, false);
    var self = this;
    channel.pushMessage({
        route: 'onThisOver',
        gameData: currentGameData
    });
    if(currentGameData.currentTimes == 2&&currentGameData.currentPlayer == (currentGameData.players.length-1)){
        setTimeout(function(){
            self.gameOver(rid,currentGameData);
        },5000);
    }else{
        if(currentGameData.currentPlayer == (currentGameData.players.length-1)){
            currentGameData.currentPlayer = 0;
            currentGameData.currentTimes = 2;
        }else{
            currentGameData.currentPlayer++;
        }
        currentGameData.time = gameTime;
        currentGameData.answerRightNum = 0;
        currentGameData.answer = getAnswer();

        setTimeout(function(){
            channel.pushMessage({
                route: 'onChangeGamer'
            });
            self.startCountTime(rid,currentGameData);
        },5000);
    }
};

//游戏结束
RoomRemote.prototype.gameOver = function(rid,currentGameData){
    this.timeCounts[rid]&&clearTimeout(this.timeCounts[rid]);
    this.gameData[rid] = '';
    this.roomList[rid].state = 0;
    var channelServer = this.channelService.getChannel(this.roomList[rid].sid, false);
    if( !! channelServer){//通知大厅更改房间状态
        channelServer.pushMessage({
            route: 'onRoomGameOver',
            roomId: rid
        });
    }
    var channel = this.channelService.getChannel(rid, false);
    channel.pushMessage({
        route: 'onGameOver',
        players: currentGameData.players
    });
}


