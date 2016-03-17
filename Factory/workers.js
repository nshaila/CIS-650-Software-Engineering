var Discover = require('node-discover');
var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "";
var bag_ip = "192.168.0.103";
var bag_port = "3000";
var port = "4000";
var id = 0;
var querystring = require('querystring');

var states = {
	GAP : 0,
	WAIT : 1,
	CRITICAL : 2
};

var currReply = new Array(9);
var currRequest = new Array(9);

var currentState = new Array(9);

for (var i = 0; i < 9; i++) {
	currentState[i] = states.GAP;
	currReply[i] = 0;
	currRequest[i] = 0;
}

var requestQueue = new Object();
var replyQueue = new Object();
for (var i = 1; i < 9; i++) {
	replyQueue[i] = new Array();
	requestQueue[i] = new Array();
}

var robot1Map = new Object(); // or var map = {};
robot1Map[1] = [ 5, 1 ];
robot1Map[2] = [ 5, 6, 2 ];
robot1Map[3] = [ 5, 6, 7, 3 ];

var robot2Map = new Object(); // or var map = {};
robot2Map[1] = [ 7, 6, 5, 1 ];
robot2Map[2] = [ 7, 6, 2 ];
robot2Map[3] = [ 7, 3 ];

// set this to 1 or 2;
var robotId = 1;

var my_time = 0;
var highest_time = 0;
var numNodes = 0;

var workerChannel = "worker";

var messageType = {
	request : 0,
	response : 1,
	enterCs : 2,
	leaveCs : 3
};

function message(msgType, tStamp, ipAddr, port, tileId) {
	this.port = port;
	this.messageType = msgType;
	this.TileId = tileId;
	this.timeStamp = tStamp;
	this.ipAddress = ipAddr;

}

var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function(ifname) {
	var alias = 0;

	ifaces[ifname].forEach(function(iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
			return;
		}

		if (alias >= 1) {
			my_ip = iface.address;
		} else {
			my_ip = iface.address;
		}
	});
});

app.use(bodyParser.urlencoded());

// Create a screen object.
var screen = blessed.screen();

var list = blessed.list({
	parent : screen,
	width : '60%',
	height : '60%',
	top : 0,
	left : 0,
	align : 'left',
	fg : 'blue',
	border : {
		type : 'line'
	},
	// selectedBg: 'white',
	selectedBold : true,
	mouse : true,
	keys : true,
	vi : true
});

var list2 = blessed.list({
	parent : screen,
	width : '40%',
	height : '100%',
	top : 0,
	right : 0,
	align : 'left',
	fg : 'blue',
	border : {
		type : 'line'
	},
	// selectedBg: 'white',
	selectedBold : true,
	mouse : true,
	keys : true,
	vi : true
});

var moveButton = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	bottom : 0,
	left : 0,
	width : '60%',
	height : '40%',
	name : 'Move',
	content : 'Move',
	style : {
		fg : 'black',
		bg : 'blue',
		focus : {
			bg : 'blue',
			fg : 'white'
		},
		hover : {
			bg : 'black',
			fg : 'white'
		}
	},
	border : {
		type : 'line'
	}
});

app.set('port', process.env.PORT || port);

list.prepend(new blessed.Text({
	left : 2,
	content : ' This node is  ' + my_ip
}));

list2.prepend(new blessed.Text({
	left : 2,
	content : "Direction Updates.."
}));

screen.render();

var logCount = 0;

var logCount2 = 0;

function direction(log, tileId) {

	postWithCallBack('/updateUI', {
		ip : my_ip,
		tileId : tileId,
		robot : robotId
	}, bag_ip, bag_port, function(response) {

		response = JSON.parse(response);
		myLogs(response.done);

	});

	directionLog(log);
}

function directionLog(log) {
	list2.add("" + log);
	list2.focus();
	list2.select(logCount2++);
	screen.render();
}

function myLogs(log) {
	list.add("" + log);
	list.focus();
	list.select(logCount++);
	screen.render();
}

function changeColor(color) {
	list.style.bg = color;
	list.style.item.bg = color; // green for get
	screen.render();
}

function getCriticalSection(tileId) {

	if (currentState[tileId] === states.CRITICAL
			|| currentState[tileId] === states.WAIT)
		return;

	myLogs("Nodes:" + numNodes);

	if (numNodes === 0) {
		enterCriticalSection(tileId);
		return;
	}
	// increment our time stamp
	my_time = highest_time + 1;
	// changeColor('yellow');

	var success1 = d.send(workerChannel, {
		Port : port,
		MessageType : messageType.request,
		TimeStamp : my_time,
		ipAddress : my_ip,
		TileId : tileId
	});

	if (!success1)
		myLogs("sending message failed");
	else {
		myLogs("Request Message Sent");
		currentState[tileId] = states.WAIT;
	}

}

function releaseCriticalSection(tileId) {

	if (currentState[tileId] !== states.CRITICAL)
		return;

	changeColor('green'); // green for get

	for (var i = 0; i < requestQueue[tileId].length; i++) {

		var msg = requestQueue[tileId][i];
		if (typeof msg !== "undefined" && msg !== null) {
			var address = msg.ipAddress;
			myLogs("sending to address" + address);
			createResponseMessage(port, my_ip, my_time, address, tileId);
		}

	}

	myLogs("Leave Critical Section here" + tileId);
	currentState[tileId] = states.GAP;
	replyQueue[tileId].length = 0;
	requestQueue[tileId].length = 0;

}

function postWithCallBack(url, data, host, port, callback) {
	var post_data = querystring.stringify(data);
	var post_options = {
		host : host,
		port : port,
		path : url,
		method : 'POST',
		headers : {
			'Content-Type' : 'application/x-www-form-urlencoded',
			'Content-Length' : post_data.length
		}
	};
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			if (typeof callback == 'function')
				callback(chunk);
		});
	});

	// post the data
	post_req.write(post_data);

	post_req.end();
}

var currentlyWorking = false;
var currentPath = null;
var countCurrentPath = 0;
var currentTaskId = "";

// ping bag for task
function getTaskFromBag() {
	if (currentlyWorking)
		return;
	countCurrentPath = 0;
	currentPathIndex = 0;
	currentPath = new Array();
	currentTaskId = "";
	// logbox.setContent("Checking bag " + new Date().toString());
	// screen.render();
	postWithCallBack('/getTask', {
		ip : my_ip
	}, bag_ip, bag_port, function(response) {

		response = JSON.parse(response);
		// myLogs(response.gotTask);
		if (response.gotTask === true) {
			myLogs("\nMoving to ");
			currentlyWorking = true;
			moveToTarget(response);
		}
	});
	setTimeout(getTaskFromBag, 3000);

}

function moveToTarget(response) {

	var bayId = response.taskDes;
	currentTaskId = response.taskId;
	myLogs("Task for bay " + bayId);
	if (bayId.valueOf() === "bay1") {
		myLogs("compare bay 1");
		if (robotId === 1)
			currentPath = robot1Map[1];
		else
			currentPath = robot2Map[1];

	} else if (bayId.valueOf() === "bay2") {
		myLogs("compare bay 2");
		if (robotId === 1)
			currentPath = robot1Map[2];
		else
			currentPath = robot2Map[2];

	} else if (bayId.valueOf() === "bay3") {
		myLogs("compare bay 3");
		if (robotId === 1)
			currentPath = robot1Map[3];
		else
			currentPath = robot2Map[3];

	}
	if (currentPath == null) {
		myLogs("Path not found");
		return;
	}
	directionLog("Path:"+currentPath.toString());

	reserveTotalPath();
}

var currentPathIndex = 0;

function putResultInBag(tileId) {

	myLogs("Putting Result");
	postWithCallBack('/outResultRobot', {
		ip : my_ip,
		bay : tileId,
		taskId : currentTaskId
	}, bag_ip, bag_port, function(response) {

		response = JSON.parse(response);
		myLogs(response.done);

	});
}

function reserveTotalPath() {

	myLogs("Get Total Path");
	countCurrentPath = currentPath.length - 1;
	for (var i = 0; i < currentPath.length; i++) {
		getCriticalSection(currentPath[i]);
	}

}
var moveDirection = false;
moveButton.on('press', function() {
	myLogs(" Count:" + countCurrentPath );
	if (!currentlyWorking || countCurrentPath != -1)
	{	
		myLogs("Not your turn.");
		return;
	}
	if (moveDirection) {
		if (currentMoveIndex == currentPath.length) {
			currentMoveIndex = currentMoveIndex - 1;
			var prev = currentPath[currentMoveIndex];
			putResultInBag(currentPath[currentMoveIndex]);
			myLogs("Going back");
			direction("Turn from tile " + prev, prev);
			releaseCriticalSection(prev);
			currentMoveIndex--;
			moveDirection = false;
			return;
		}
		var prev = currentPath[currentMoveIndex];
		direction("Move to tile  " + prev, prev);
		currentMoveIndex++;

	} else {

		myLogs("Going Back  i: " + i);
		if (currentMoveIndex < 0) {
			if (robotId === 1)
				direction("Move to tile  4", 4);
			else
				direction("Move to tile  8", 8);

			currentlyWorking = false;
			directionLog("---------------------------------");

			getTaskFromBag();
			return;
		}

		var prev = currentPath[currentMoveIndex];
		direction("Move to tile  " + prev, prev);
		releaseCriticalSection(prev);
		currentMoveIndex--;

	}

});

function moveBackWard(i) {

}
var currentMoveIndex = 0;

function traversePath() {

	if (currentPath == null) {
		myLogs("Path not found");
		return;
	}
	var prev = currentPath[0];
	myLogs("Worker 1 start moving..." );
	direction("Click Button to move to" + prev);
	currentMoveIndex = 0;
	moveDirection = true;
	return;

}

var d;
joinNetwork();
function joinNetwork() {

	d = new Discover({
		helloInterval : 4000,
		checkInterval : 5000,
		nodeTimeout : 5000,
		masterTimeout : 5000,

	});

	registerCallbacks();
	myLogs("callbacks done --");
	getTaskFromBag();

}

function enterCriticalSection(tile_id) {

	// myLogs("Sending to CS");
	currentPathIndex++;
	myLogs("In Critical Now..." + tile_id);
	currentState[tile_id] = states.CRITICAL;
	replyQueue[tile_id].length = 0;
	currReply[tile_id] = 0;
	changeColor('red');

	countCurrentPath--;

	if (countCurrentPath == -1) {
		myLogs("Got the Path...");
		traversePath();
	}
}

function receiveResponseData(data) {

	if (data.ipTo !== my_ip) {
		myLogs("message not for me");
		return;
	}

	myLogs("processing  the message");
	var tTime = parseInt(data.TimeStamp);
	var tileId = parseInt(data.TileId);
	myLogs("recieve msg tile" + tileId);
	if (replyQueue[tileId].length >= (numNodes - 1))
		enterCriticalSection(tileId);
	else {

		replyQueue[tileId][currReply[tileId]] = new message(
				messageType.response, tTime, data.ipAddress, data.Port, tileId);
		currReply[tileId] += 1;
		myLogs("Got a reply " + currReply[tileId]);
	}

}

/*
 * the worker receives a broadcasted message from the bag. The worker then
 * submits a request message to the bag for a particular task. If this worker is
 * chosen for the task, then it receives a response message from the bag.
 * Finally, the worker submits a response message to the bag, with the result
 * task.
 * 
 * Worker: 1 request, 1 response (send); Bag: 1 request, 1 response (send);
 * 
 * Receive a broadcasted task message with a task ID, description, sender IP
 * address, and timestamp.
 * 
 */

function receiveMessage(data) {

	if (typeof data === "undefined" || data === null) {
		myLogs("Data is null");
		return;
	}

	var tMessage = parseInt(data.MessageType);

	if (tMessage === messageType.response) {
		receiveResponseData(data);
	}

	var tTime = parseInt(data.TimeStamp);
	var address = data.ipAddress;

	if (address === my_ip) {
		myLogs("Message not for me ...");
		return;
	}
	var tileId = parseInt(data.TileId);
	highest_time = tTime;
	myLogs("Request for tile" + tileId);
	switch (currentState[tileId]) {

	case states.GAP:

	{
		changeColor('green');
		myLogs("in  Gap State" + address);
		createResponseMessage(port, my_ip, my_time, address, tileId);
	}
		break;

	case states.WAIT:

	{
		changeColor('yellow');
		myLogs("Wait State");
		if (tTime < my_time) {
			// send reply
			myLogs("Send Reply -- tTime < my_time");
			createResponseMessage(port, my_ip, my_time, address, tileId);
		} else if (tTime > my_time) {
			myLogs("tTime > my_time so defer reply!!");
			requestQueue[tileId][currRequest[tileId]] = new message(
					messageType.request, tTime, data.ipAddress, data.Port,
					tileId);
			currRequest[tileId] += 1;
		} else if (tTime == my_time) {
			myLogs("There is a Tie ");
			if (my_ip > address) {
				createResponseMessage(port, my_ip, my_time, address, tileId);
			} else {
				// myLogs("defer reply");
				requestQueue[tileId][currRequest[tileId]] = new message(
						messageType.request, tTime, data.ipAddress, data.Port,
						tileId);
				currRequest[tileId] += 1;
			}
		}
	}
		break;

	case states.CRITICAL: {
		// myLogs("in CRITICAL state");
		changeColor('red');
		if (tMessage === messageType.request) {
			if (highest_time < tTime) {
				highest_time = tTime;
			}

			if (typeof address === "undefined") {
				console
						.log("------------------------------------------------------typeof address ===  undefined-------");
			}
			requestQueue[tileId][currRequest[tileId]] = new message(
					messageType.request, tTime, address, data.Port, tileId);
			currRequest[tileId] += 1;
			// myLogs("queue the request--");
		}
	}
		break;
	}

}

function registerCallbacks() {

	var success = d.join(workerChannel, receiveMessage);
	if (success) {
		myLogs("Joined Worker Channel");
	}

	d.on("added", function(obj) {

		numNodes++;
		myLogs("Other nodes " + numNodes);
	});

	d.on("removed", function(obj) {

		numNodes--;
		myLogs("Other nodes " + numNodes);
		if (currentState == states.WAIT && replyQueue.length == (numNodes)) {

			enterCriticalSection();
		}

	});

	d.on("master", function(obj) {

	});

	d.eachNode(function(node) {
	});
}

function createResponseMessage(port, ip, timeStamp, address, tileId) {

	var success1 = d.send(workerChannel, {
		Port : port,
		TileId : tileId,
		MessageType : messageType.response,
		TimeStamp : timeStamp,
		ipAddress : ip,
		ipTo : address
	// //
	});

	if (!success1) {
		myLogs("sending message failed");
	} else {
		myLogs("Response Message Sent");
	}

}

// Quit on Escape, q, or Control-C.
screen.key([ 'escape', 'q', 'C-c' ], function(ch, key) {
	return process.exit(0);
});

screen.render();

http.createServer(app).listen(app.get('port'), function() {
	myLogs("Express server listening on port " + app.get('port'));

});

process.on('uncaughtException', function(err) {
	myLogs('Caught exception: ' + err);
});