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
var states = {
	GAP : 0,
	WAIT : 1,
	CRITICAL : 2
};
var currentState = 0;
var requestQueue = [];
var replyQueue = [];
var currReply = 0;
var currRequest = 0;
var my_time = 0;
var highest_time = 0;
var numNodes = -1;
//var networkKey = "123456789";
var workerChannel = "worker";
var criticalChannel = "critical";
var fs = require('fs');
var ursa = require('ursa');

var messageType = {
	request : 0,
	response : 1,
	enterCs : 2,
	leaveCs : 3
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
	parent : screen,
	width : '50%',
	height : '100%',
	top : 0,
	left : 0,
	align : 'center',
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

var buttonRequest = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	top : 0,
	right : 0,
	width : '50%',
	height : '50%',
	name : 'Request',
	content : 'Request',
	style : {
		fg : 'black',
		bg : 'blue',
		focus : {
			bg : 'blue',
			fg : 'white'
		},
		hover : {
			bg : 'blue',
			fg : 'white'
		}
	},
	border : {
		type : 'line'
	}
});

var buttonRelease = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	bottom : 0,
	right : 0,
	width : '50%',
	height : '50%',
	name : 'Release',
	content : 'Release',
	style : {
		fg : 'black',
		bg : 'red',
		focus : {
			bg : 'red',
			fg : 'white'
		},
		hover : {
			bg : 'blue',
			fg : 'white'
		}
	},
	border : {
		type : 'line'
	}
});

app.set('port', process.env.PORT || port);
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
list.prepend(new blessed.Text({
	left : 2,
	content : ' This node is  ' + my_ip
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
	list.style.item.bg = color; // green for get
	screen.render();
}

buttonRequest.on('press', function() {

	if (currentState === states.CRITICAL || currentState === states.WAIT)
		return;

	myLogs("Nodes:" + numNodes);

	// increment our time stamp
	my_time = highest_time + 1;
	changeColor('yellow');

	var success1 = d.send(workerChannel, {
		Port : port,
		MessageType : messageType.request,
		TimeStamp : my_time,
		ipAddress : my_ip
	});

	if (!success1) {
		myLogs("sending message failed");
	} else {
		myLogs("Request Message Sent");
		currentState = states.WAIT;
	}

	if (numNodes == 0) {
		enterCriticalSection();

	}

});

buttonRelease.on('press', function() {
	// //myLogs("state" + currentState);

	if (currentState !== states.CRITICAL)
		return;

	changeColor('green'); // green for get
	// myLogs("Release" + requestQueue.length);

	for (var i = 0; i < requestQueue.length; i++) {

		var msg = requestQueue[i];
		if (typeof msg !== "undefined" && msg !== null) {
			var address = msg.ipAddress;
			myLogs("sending to address" + address);
			createResponseMessage(port, my_ip, my_time, address);
		}

	}
	leaveCriticalSection();
	currentState = states.GAP;
	replyQueue = [];
	requestQueue = [];

});

function receiveCAMessage(data) {
	console.log('Decrypt with Private');
	//msg = key.decrypt(data, 'base64', 'utf8');
	//console.log('decrypted', msg, '\n');
	
	var key = ursa.createPrivateKey(fs.readFileSync('private.pem'));
    var networkKey = key.decrypt(data.key.toString('base64'), 'base64', 'utf8');
    myLogs("decrypted got key ");    
    myLogs(networkKey);
    joinNetwork(networkKey);
    

}

getKeyFromCA();

function PostObject(post_data, sendto) {
	// An object of options to indicate where to post to   
	// console.log('problem with request: ' + pendingQueue);
	var post_options = {
		host : sendto,
		port : '4000',
		path : '/do_post',
		method : 'POST',
		headers : {
			'Content-Type' : 'application/x-www-form-urlencoded',
			'Content-Length' : Buffer.byteLength(post_data)
		}
	};

	// Set up the request
	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(chunk) {

		});
	});

	post_req.on('error', function(e, post_data) {
		console.log("Error connecting");
	});

	post_req.write(post_data);
	post_req.end();
}

// handle POST requests
app.post('/do_post', function(req, res) {
	//console.log("Received Message");
	var the_body = req.body;

	receiveCAMessage(the_body);

	res.json({
		"body" : the_body,
		"id" : JSON.stringify(my_ip)
	});

});

function getKeyFromCA() {

	var my_private_key = ursa.createPrivateKey(fs.readFileSync('private.pem'));
	var ca_public_key = ursa.createPublicKey(fs.readFileSync('publicCA.pub'));

	myLogs('Encrypt with Public');
	var mac_ip = "def" + ":" + my_ip;
	msg = ca_public_key.encrypt(mac_ip, 'utf8', 'base64');
	myLogs('encrypted', msg, '\n');

	var post_data = querystring.stringify({
		message : msg
	});
	PostObject(post_data, "192.168.0.107");

}
var d ;
function joinNetwork(networkKey) {

	d = new Discover({
		helloInterval : 1000,
		checkInterval : 2000,
		nodeTimeout : 2000,
		masterTimeout : 2000,
		key : networkKey

	});

	registerCallbacks();

}

function receiveCsMessage(data) {
	myLogs("Doing Nothing")
}

function enterCriticalSection() {
	myLogs("Sending to CS");
	var success = d.join(criticalChannel, receiveCsMessage);
	if (success) {
		myLogs("criticalChannel joined");
	}
	var success1 = d.send(criticalChannel, {
		Port : port,
		MessageType : messageType.enterCs,
		ipAddress : my_ip
	});

	if (!success1) {
		myLogs("sending message failed");
	} else {
		myLogs("In Critical Now...");
		currentState = states.CRITICAL;
		replyQueue = [];
		currReply = 0;
		changeColor('red');
	}

}

function leaveCriticalSection() {
	var success1 = d.send(criticalChannel, {
		Port : port,
		MessageType : messageType.leaveCs,
		ipAddress : my_ip
	});

	if (!success1) {
		myLogs("sending message failed");
	}
}

function receiveResponseData(data) {
	// myLogs("receivePostdata");

	if (data.ipTo !== my_ip) {
		myLogs("message not for me");
		return;
	}

	myLogs("processing  the message");
	var tTime = parseInt(data.TimeStamp);
	// myLogs("receivePostdata" + address + "message type" + tMessage);
	if (replyQueue.length >= (numNodes - 1)) {

		enterCriticalSection();

	} else {

		replyQueue[currReply] = new message(messageType.response, tTime,
				data.ipAddress, data.Port);
		currReply++;
		myLogs("Got a reply " + currReply);
	}

}

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
	highest_time = tTime;

	switch (currentState) {

	case states.GAP:

	{
		changeColor('green');
		myLogs("in  Gap State" + address);
		createResponseMessage(port, my_ip, my_time, address);
	}
		break;

	case states.WAIT:

	{
		changeColor('yellow');
		myLogs("Wait State");
		if (tTime < my_time) {
			// send reply
			myLogs("Send Reply -- tTime < my_time");
			createResponseMessage(port, my_ip, my_time, address);
		} else if (tTime > my_time) {
			myLogs("tTime > my_time so defer reply!!");
			requestQueue[currRequest] = new message(messageType.request, tTime,
					data.ipAddress, data.Port);
			currRequest++;
		} else if (tTime == my_time) {
			myLogs("There is a Tie ");
			if (my_ip > address) {
				createResponseMessage(port, my_ip, my_time, address);
			} else {
				// myLogs("defer reply");
				requestQueue[currRequest] = new message(messageType.request,
						tTime, data.ipAddress, data.Port);
				currRequest++;
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
			requestQueue[currRequest] = new message(messageType.request, tTime,
					address, data.Port);
			currRequest++;
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

function createResponseMessage(port, ip, timeStamp, address) {

	var success1 = d.send(workerChannel, {
		Port : port,
		MessageType : messageType.response,
		TimeStamp : timeStamp,
		ipAddress : ip,
		ipTo : address
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
	console.log('Caught exception: ' + err);
});