var LOGIN_ERROR = "There is no server to log in, please wait.";
var LENGTH_ERROR = "Name/Channel is too long or too short. 20 character max.";
var NAME_ERROR = "Bad character in Name/Channel. Can only have letters, numbers, Chinese characters, and '_'";
var DUPLICATE_ERROR = "Please change your name to login.";

function queryEntry(uid, callback) {
	var route = 'gate.gateHandler.queryEntry';
	pomelo.init({
		host: window.location.hostname,
		port: 3010,
		log: true
	}, function() {
		pomelo.request(route, {
			uid: uid
		}, function(data) {
			pomelo.disconnect();
			console.log(data)
			if(data.code === 500) {
				showError(LOGIN_ERROR);
				return;
			}
			callback(data.host, data.port);
		});
	});
};

function getName(){
	$("#login_btn").click(function(){
		var name = $("#login_input").val();
		if($.trim(name) == ""){
			alert("昵称不能为空");
		}else{
			showRooms($.trim(name));
		}
	})
}

function showRooms(uid){
	$("#roomlist").show().siblings().hide();
	queryEntry(uid,function(host,port){
		pomelo.init({
			host: host,
			port: port,
			log: true
		}, function() {
			pomelo.request("connector.entryHandler.enter", {
				uid: uid
			}, function(data) {
				if(data.code === 500) {
					showError(DUPLICATE_ERROR);
					return;
				}
				if(data.rooms){
					var html = '';
					for(var room in data.rooms){
						html += '<li><em>'+data.rooms[room].name+'</em>创建的房间:<em>2</em>个人<span>已开始</span></li>';
					}
					$(".room_list").html(html);
				}
			});
		});
	});
}

function creatRoom(){
	$("#room").show().siblings().hide();
	pomelo.request("connector.entryHandler.creatRoom", function(data) {
		if(data.code === 500) {
			showError(DUPLICATE_ERROR);
			return;
		}
		console.log(data)
	});
}

$(function(){
	getName();
})