var Discover = require('node-discover');
var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "";
var port = "4000";
var master_ip = "";
var states = {
	GAP: 0,
	WAIT: 1,
	CRITICAL: 2
};
var currentState = 0;
var requestQueue = [];
var replyQueue = [];
var currReply = 0;
var currRequest = 0;
var my_time = 0;
var highest_time = 0;
var numNodes = 0;

var messageType = {
	request: 0,
	response: 1
};
var currState = states.GAP;

function message(msgType, tStamp, ipAddr, port) {
	this.port = port;
	this.messageType = msgType;
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
	parent: screen,
	width: '50%',
	height: '100%',
	top: 0,
	left: 0,
	align: 'center',
	fg: 'blue',
	border: {
		type: 'line'
	},
	//selectedBg: 'white',
	selectedBold: true,
	mouse: true,
	keys: true,
	vi: true
});

var buttonRequest = blessed.button({
	parent: screen,
	mouse: true,
	keys: true,
	shrink: true,
	top: 0,
	right: 0,
	width: '50%',
	height: '50%',
	name: 'Request',
	content: 'Request',
	style: {
		fg: 'black',
		bg: 'blue',
		focus: {
			bg: 'blue',
			fg: 'white'
		},
		hover: {
			bg: 'blue',
			fg: 'white'
		}
	},
	border: {
		type: 'line'
	}
});

var buttonRelease = blessed.button({
	parent: screen,
	mouse: true,
	keys: true,
	shrink: true,
	bottom: 0,
	right: 0,
	width: '50%',
	height: '50%',
	name: 'Release',
	content: 'Release',
	style: {
		fg: 'black',
		bg: 'red',
		focus: {
			bg: 'red',
			fg: 'white'
		},
		hover: {
			bg: 'blue',
			fg: 'white'
		}
	},
	border: {
		type: 'line'
	}
});

app.set('port', process.env.PORT || port);
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
list.prepend(new blessed.Text({
	left: 2,
	content: ' This node is  ' + my_ip
}));
screen.render();

var logCount = 0;

function myLogs(log) {
	list.add("" + log);
	list.focus();
	list.select(logCount++);
	screen.render();
}

function changeColor(color) {
	list.style.bg = color;
	list.style.item.bg = color; //green for get
	screen.render();
}

buttonRequest.on('press', function() {

	if (currentState === states.CRITICAL || currentState === states.WAIT)
		return;

	myLogs("Nodes:" + numNodes);

	//increment our time stamp
	my_time = highest_time + 1;
	changeColor('yellow');

	var success1 = d.send(master_ip, {
		Port: port,
		MessageType: messageType.request,
		TimeStamp: my_time,
		ipAddress: my_ip
	});

	if (!success1) {
		myLogs("sending message failed");
	} else {
		currentState = states.WAIT;
	}

	if (numNodes == 0) {
		currentState = states.CRITICAL;
		myLogs("Entering critical section");
		changeColor('red');
	}

});

buttonRelease.on('press', function() {
	// //myLogs("state" + currentState); 
	if (currentState !== states.CRITICAL)
		return;

	changeColor('green'); //green for get
	//myLogs("Release" + requestQueue.length);

	for (var i = 0; i < requestQueue.length; i++) {

		var msg = requestQueue[i];

		if (typeof msg !== "undefined" && msg !== null) {
			var address = msg.ipAddress;
			myLogs("sending to address" + address);
			createPost(port, my_ip, messageType.response, my_time, address);
		}
	}
	currentState = states.GAP;
	replyQueue = [];
	requestQueue = [];
	currReply = 0;
	currRequest = 0;

});

var d = new Discover({
	helloInterval: 1000,
	checkInterval: 2000,
	nodeTimeout: 2000,
	masterTimeout: 2000
});

registerCallbacks();

function receivePostdata(data) {
	//myLogs("receivePostdata");
	var tTime = parseInt(data.TimeStamp);
	//myLogs("receivePostdata" + address + "message type" + tMessage);
	if (replyQueue.length >= (numNodes - 1)) {
		changeColor('red');
		currentState = states.CRITICAL;
		myLogs("Critical section");
	} else {

		replyQueue[currReply] = new message(messageType.response, tTime,
			data.ipAddress, data.Port);
		currReply++;
		myLogs("Got a reply " + currReply);
	}

}

function receiveMessage(data) {
	//myLogs("Received ");
	var tMessage = parseInt(data.MessageType);
	var tTime = parseInt(data.TimeStamp);
	var address = data.ipAddress;
	highest_time = tTime;
	//myLogs("Highest time updated" + highest_time);
	//myLogs("address:" + address);

	switch (currentState) {

		case states.GAP:

			{
				changeColor('green');
				myLogs("in  Gap State" + address);
				createPost(port, my_ip, messageType.response, my_time, address);
			}
			break;

		case states.WAIT:

			{
				changeColor('yellow');
				myLogs("Wait State");
				if (tTime < my_time) {
					//send reply 
					myLogs("Send Reply -- tTime < my_time");
					createPost(port, my_ip, messageType.response, my_time, address);
				} else if (tTime > my_time) {
					myLogs("tTime > my_time so defer reply!!");
					requestQueue[currRequest] = new message(messageType.request, tTime,
						data.ipAddress, data.Port);
					currRequest++;
				} else if (tTime == my_time) {
					myLogs("There is a Tie ");
					if (my_ip > address) {
						myLogs("Sending--");
						createPost(port, my_ip, messageType.response, my_time, address);
					} else {
						myLogs("defer reply");
						requestQueue[currRequest] = new message(messageType.request,
							tTime, data.ipAddress, data.Port);
						currRequest++;
					}
				}
			}
			break;

		case states.CRITICAL:
			{
				//myLogs("in CRITICAL state");
				changeColor('red');
				if (tMessage === messageType.request) {
					if (highest_time < tTime) {
						highest_time = tTime;
					}					
					requestQueue[currRequest] = new message(messageType.request, tTime,
						address, data.Port);
					currRequest++;
					//myLogs("queue the request--");
				}
			}
			break;
	}

}

function registerCallbacks() {

	d.on("promotion", function() {
		master_ip = my_ip;
		var success = d.join(my_ip, receiveMessage);
		if (!success) {
			//myLogs("could not join that channel; probably because it is reserved");
		}
	});

	d.on("demotion", function() {

	});

	d.on("added", function(obj) {

		numNodes++;
		myLogs("Other nodes " + numNodes);
	});

	d.on("removed", function(obj) {

		numNodes--;
		myLogs("Other nodes " + numNodes);
		if (currentState == states.WAIT && replyQueue.length == (numNodes)) {

			changeColor('red');
			currentState = states.CRITICAL;
			myLogs("Critical section");
		}

	});

	d.on("master", function(obj) {

		master_ip = obj.address;
		var success = d.join(master_ip, receiveMessage);
		if (!success) {
			//myLogs("slave could not join that channel; probably because it is reserved");
		}

	});

	d.eachNode(function(node) {});
}

function createPost(port, ip, messageType, timeStamp, address) {
	var post_data = querystring.stringify({
		Port: port,
		ipAddress: ip,
		MessageType: messageType,
		TimeStamp: timeStamp
	});
	PostObject(post_data, address);
}

function PostObject(post_data, address) {
	// An object of options to indicate where to post to

	//myLogs('Sending PostObject');
	var post_options = {
		host: address,
		port: port,
		path: '/do_post',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(post_data)
		}
	};

	// Set up the request
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(chunk) {

		});
	});

	post_req.on('error', function(e, post_data) {
		myLogs('problem with sending request: ');

	});

	post_req.write(post_data);
	post_req.end();
}

app.get('/', function(request, response) {
	response.sendfile('test.html');
});

// handle POST requests
app.post('/do_post', function(req, res) {
	//myLogs("app.post received" );

	receivePostdata(req.body);
	res.json({
		"query": req.body,
		"id": JSON.stringify(my_ip)
	});
});

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.render();

http.createServer(app).listen(app.get('port'), function() {
	myLogs("Express server listening on port " + app.get('port'));

});

process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
});