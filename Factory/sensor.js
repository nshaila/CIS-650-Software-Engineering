var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();

var my_ip = "";
var port = "4000";
var my_bay = 1;
var bag_ip = "192.168.0.102";
var bag_port = "3000";

var currReply = 0;
var currRequest = 0;
var numNodes = 0;
var sensorValue = 0;

var workingOnTask = false;
var currDesc = "";
var currTaskID = "";

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

var buttonSensor1 = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	top : 0,
	left : '50%',
	width : '25%',
	height : '50%',
	name : 'Value10',
	content : 'Value10',
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

var buttonSensor2 = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	top : 0,
	right : 0,
	width : '25%',
	height : '50%',
	name : 'Value20',
	content : 'Value20',
	style : {
		fg : 'black',
		bg : 'red',
		focus : {
			bg : 'red',
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

var buttonSensor3 = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	bottom : 0,
	right : 0,
	width : '25%',
	height : '50%',
	name : 'Value30',
	content : 'Value30',
	style : {
		fg : 'black',
		bg : 'yellow',
		focus : {
			bg : 'orange',
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

var buttonSensor4 = blessed.button({
	parent : screen,
	mouse : true,
	keys : true,
	shrink : true,
	bottom : 0,
	left : '50%',
	width : '25%',
	height : '50%',
	name : 'Value40',
	content : 'Value40',
	style : {
		fg : 'black',
		bg : 'green',
		focus : {
			bg : 'green',
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
	list.style.item.bg = color;
	screen.render();
}

buttonSensor1.on('press', function() {
	if (workingOnTask) {
		myLogs("Sensor Value: 10");
		changeColor('yellow');
		var response = {
			sensorReading : 10,
			id : currTaskID,
			description : currDesc,
			idSender : "sensor",
			ip : my_ip
		}
		myLogs("Adding result to bag")
		postWithCallBack('/addSensorResult', response, bag_ip, bag_port, null);
		workingOnTask = false;
		changeColor('blue');
		getTaskFromBag();
	}
});

buttonSensor2.on('press', function() {
	if (workingOnTask) {
		myLogs("Sensor Value: 20");
		changeColor('yellow');
		var response = {
			sensorReading : 20,
			id : currTaskID,
			description : currDesc,
			idSender : "sensor",
			ip : my_ip
		}
		myLogs("Adding result to bag")
		postWithCallBack('/addSensorResult', response, bag_ip, bag_port, null);
		workingOnTask = false;
		changeColor('red');
		getTaskFromBag();
	}
});

buttonSensor3.on('press', function() {
	if (workingOnTask) {
		myLogs("Sensor Value: 30");
		changeColor('yellow');
		var response = {
			sensorReading : 30,
			id : currTaskID,
			description : currDesc,
			idSender : "sensor",
			ip : my_ip
		}
		myLogs("Adding result to bag")
		postWithCallBack('/addSensorResult', response, bag_ip, bag_port, null);
		workingOnTask = false;
		changeColor('orange');
		getTaskFromBag();
	}
});

buttonSensor4.on('press', function() {
	if (workingOnTask) {
		myLogs("Sensor Value: 40");
		changeColor('yellow');
		var response = {
			sensorReading : 40,
			id : currTaskID,
			description : currDesc,
			idSender : "sensor",
			ip : my_ip
		}
		myLogs("Adding result to bag");
		postWithCallBack('/addSensorResult', response, bag_ip, bag_port, null);
		workingOnTask = false;
		changeColor('green');
		getTaskFromBag();

	}
});

getTaskFromBag();

// ping bag for task
function getTaskFromBag() {
	if (workingOnTask)
		return;

	myLogs("Get Sensor Task....");
	// logbox.setContent("Checking bag " + new Date().toString());
	// screen.render();
	postWithCallBack('/getSensorTask', {
		bayId : my_bay
	}, bag_ip, bag_port, function(response) {

		response = JSON.parse(response);
		myLogs(response.gotTask);
		if (response.gotTask === true) {
			myLogs("Got message from bag!");
			myLogs("Get a sensor reading...");
			currDesc = response.taskDes;
			currTaskID = response.taskId;
			workingOnTask = true;
			// moveToTarget(response);
		}
	});
	// Ping the bag every 5 seconds
	setTimeout(getTaskFromBag, 5000);

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

app.get('/', function(request, response) {
	response.sendfile('test.html');
});

// handle POST requests
app.post('/do_post', function(req, res) {
	// myLogs("app.post received" );

	res.json({
		"query" : req.body,
		"id" : JSON.stringify(my_ip)
	});
});

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
