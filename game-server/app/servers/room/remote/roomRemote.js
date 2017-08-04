module.exports = function(app) {
	return new RoomRemote(app);
};

var RoomRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
	this.userInfo = {};
    this.roomList = [];
};



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
        this.roomList = new Array(roomsNum);
        for(var i = 0;i<roomsNum;i++){
            this.roomList[i] = {
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
        delete this.userInfo[uid]
    }
};
