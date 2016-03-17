//Imports .....
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var os = require('os');
var Discover = require('node-discover');
var blessed = require('blessed');
var bodyParser = require('body-parser');
var fs = require('fs');
var querystring = require('querystring');

// Variables ......
var my_ip = "";
var port = "4000";

// get my ip
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
	width : '100%',
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

app.set('port', process.env.PORT || port);
// function for UI ..
list.prepend(new blessed.Text({
	left : 2,
	content : ' Critical Section ..... ' + my_ip
}));
changeColor('green');

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

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/factory.html');
});

// function definitions for Bag api

/**
 * constructor for Task where each task has a numerical id, a boolean value for
 * wether this task is available, a type for the task this can either be robot
 * or sensor, and a description of what the task is
 * 
 */
function Task(tId, avail, tTask, dTask) {
	this.idT = tId;
	this.available = avail;
	this.typeTask = tTask;
	this.desTask = dTask;
}

/**
 * constructor for Result where each result has a numerical id, a value for the
 * sensor reading, a boolean value for whether this result is available for
 * being read, a type for the type of result this is which can be either robot
 * or sensor, and a description which describes the task this is the result of
 * 
 */
function Result(rId, sRead, tResult, avail, dResult) {
	this.idR = rId;
	this.sensorReading = sRead;
	this.typeResult = tResult;
	this.available = avail;
	this.desResult = dResult;
}
/**
 * constructor for the Bag, the bag has an array which holds all the currently
 * available tasks, an array that holds all the currently available results, a
 * variable that keeps track of the number of tasks, and a variable to keep
 * track of the number of results
 */
function Bag() {

	this.tasks = [];
	this.results = [];
	this.stop = false;
	this.numTasks = 0;
	this.numResults = 0;

	/**
	 * get the first available task that is for your type. That is if you are a
	 * robot get the first task for robots. If you are a sensor get the first
	 * task for sensors. Return null if there are no tasks available
	 * 
	 */
	this.inTask = function(tTask) {
		if (this.tasks.length > 0) {
			for (var i = 0; i < this.tasks.length; i++) {
				if ((this.tasks[i].typeTask == tTask)
						&& (this.tasks[i].available == true)) {

					var taskToReturn = this.tasks[i];
					this.tasks[i].available = false;
					myLogs("task to return" + taskToReturn);
					return taskToReturn;
				}
			}
			return null;
		} else {
			return null;
		}
	};

	// gets first task for specific sensor
	this.inTaskSensor = function(tTask, bayId) {
		if (this.tasks.length > 0) {
			for (var i = 0; i < this.tasks.length; i++) {
				var idBay = parseInt(this.tasks[i].desTask[3]);
				if ((this.tasks[i].typeTask == tTask)
						&& (this.tasks[i].available == true)) {

					var taskToReturn = this.tasks[i];
					this.tasks[i].available = false;
					myLogs("sensor Task" + taskToReturn.desTask);
					return taskToReturn;
				}
			}
			return null;
		} else {
			return null;
		}
	};
	/**
	 * returns the first result that is for your type which is either robot or
	 * supervisor and if there is no result available returns null
	 * 
	 */
	this.inResultFirst = function(typeReader) {
		if (typeReader == "robot") {
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].resultType == "sensor"
						&& this.results[i].available == true) {
					var resultToReturn = this.results.splice(i, 1);
					return resultToReturn[0];
				}
			}
			return null;
		} else if (typeReader == "supervisor") {

			for (var i = 0; i < this.results.length; i++) {

				if (this.results[i].resultType == "robot"
						&& this.results[i].available == true) {

					var resultToReturn = this.results.splice(i, 1);
					return resultToReturn[0];
				}
			}

			return null;
		} else {

			return null;
		}

	};

	/**
	 * returns the result with the specified id if the result is the correct
	 * type for your type and this result exists. Otherwise returns null
	 */
	this.inResult = function(typeReader, idResult) {

		if (typeReader == "supervisor") {

			for (var i = 0; i < this.results.length; i++) {

				if (idResult == this.results[i].idR
						&& this.results[i].typeResult == "robot"
						&& this.results[i].available == true) {

					var resultToReturn = this.results.splice(i, 1);
					return resultToReturn[0];
				}
			}
			return null;

		} else if (typeReader == "robot") {
			for (var i = 0; i < this.results.length; i++) {
				if (idResult == this.results[i].idR
						&& this.results[i].typeResult == "sensor"
						&& this.results[i].available == true) {
					var resultToReturn = this.results.splice(i, 1);
					return resultToReturn[0];
				}
			}
			return null;
		}

	};

	// sets the stop to false
	this.inStop = function() {

		this.stop = false;
	};

	// returns the result with the given id if it exists otherwise returns null
	this.rdResult = function(idToRead) {
		for (var i = 0; i < this.results.length; i++) {
			if (idToRead == this.results[i].idR) {
				this.results[i].available = false;
				return this.results[i];
			}
		}
		return null;
	};

	// returns the task with the given id if it exists otherwise returns null
	this.rdTask = function(idToRead) {
		for (var i = 0; i < this.results.length; i++) {
			if (idToRead == this.tasks[i].idT) {
				this.tasks[i].available = false;
				return this.tasks[i];
			}
		}
		return null;
	};

	// returns the value of stop
	this.rdStop = function() {
		return stop;
	};

	/**
	 * adds a task to the bag with type robot or sensor and a description of the
	 * task
	 * 
	 */
	this.outTask = function(tTask, des) {
		var msg = "";
		if (tTask == "supervisor") {
			var t = new Task(this.numTasks, true, "robot", des);

			this.tasks.push(t);
			this.numTasks++;
			myLogs("Task Added" + t.desTask);
			msg = "Task Added to " + t.desTask;
			updateBag(msg);

			return t.idT;
		} else if (tTask == "robot") {
			var t = new Task(this.numTasks, true, "sensor", des);
			this.tasks.push(t);
			this.numTasks++;
			msg = "Need Sensor Value for " + des;
			updateBag(msg);
			return t.idT;

		} else {
			myLogs("Error: sensor cannot add tasks to bag");
			return -1;
		}

	};
	/**
	 * adds a result to the bag with type either robot or sensor a value for the
	 * sensor reading, the id of the task the result is for, and a description
	 * of the task
	 * 
	 */
	this.outResult = function(typeResult, sensor, idResult, des) {

		if (typeResult == "robot") {
			var r = new Result(idResult, 0, typeResult, true, des);
			this.results.push(r);
			this.numResults++;
			return true;
		} else if (typeResult == "sensor") {
			var r = new Result(idResult, sensor, typeResult, true, des);
			this.results.push(r);
			this.numResults++;
			var msg = "Sensor Result " + sensor + "-" + des;
			updateBag(msg);
			sensorResult(sensor, des);

			return true;

		} else {
			myLogs("Error: invalid result for result");
			return false;
		}
	};
	// sets the value of stop to true as long as the entity doing so
	// is the supervisor
	this.outStop = function(typeReader) {
		if (typeReader == "supervisor") {
			this.stop = true;
			return true;
		} else {
			return false;
		}
	};

	// get the tasks array
	this.getTasks = function() {
		return this.tasks;
	}

	// get the results array
	this.getResults = function() {
		return this.results;
	}

}

// declare the variables needed for our bag
var currBag = new Bag();
var socketobj;
io.on('connection', function(socket) {
	socketobj = socket;
	myLogs('a user connected');
	socket.emit('connect', {
		hello : 'world'
	});

	// reply from the page ...
	socket.on('AddTask', function(data) {
		myLogs("Added the task");
		currBag.outTask("supervisor", data.msg);
	});

	socket.on('AddSensorTask', function(data) {
		myLogs("Added Sensor the task" + JSON.stringify(data));
		currBag.outTask("robot", data.msg);
	});

});

function updateBag(msg) {
	if (socketobj == undefined)
		return;

	socketobj.emit('Bag', {
		msg : msg
	});

}

function sensorResult(value, id) {
	if (socketobj == undefined)
		return;

	socketobj.emit('sensorResult', {
		value : value,
		id : id
	});

}

http.listen(3000, function() {
	myLogs('listening on *:3000');
});

app.post('/do_post', function(req, res) {
	var the_body = req.body;
	receiveMsg(the_body);
	res.json({
		"body" : the_body,
		"ip" : JSON.stringify(my_ip)
	});

});

app.post('/addSensorResult', function(req, res) {
	// get the bay id for this sensor

	var the_body = req.body;
	var tDes = the_body.description;
	var idResult = parseInt(the_body.id);
	var sRead = parseInt(the_body.sensorReading);
	currBag.outResult("sensor", sRead, idResult, tDes)
	myLogs("Added sensor result to bag!");

});

app.post('/getSensorTask', function(req, res) {
	// get the bay id for this sensor
	var body = req.body;
	var bayId = parseInt(body.bayId);
	var currTask = currBag.inTaskSensor("sensor", bayId);
	var post_data = JSON.stringify({
		gotTask : false
	});

	if (currTask != null) {
		// send message back with task information
		myLogs("Sending task to Sensor -");
		post_data = JSON.stringify({
			gotTask : true,
			taskId : currTask.idT,
			taskDes : currTask.desTask,
		});
	}

	res.write(post_data);
	res.end();

});

app.post('/updateUI', function(req, res) {
	// get the bay id for this sensor
	var body = req.body;
	var post_data = JSON.stringify({
		done : true
	});

	socketobj.emit('updateUI', {
		tileId : body.tileId,
		robot : body.robot
	});

	res.write(post_data);
	res.end();

});

app.post('/outResultRobot', function(req, res) {
	var body = req.body;
	var post_data = JSON.stringify({
		done : false
	});
	var des = "bay" + body.bay;
	currBag.outResult("robot", 0, body.taskId, des);
	updateBag("Result body.taskId :" + des);

	res.write(post_data);
	res.end();

});

app.post('/getTask', function(req, res) {
	var currTask = currBag.inTask("robot");
	var post_data = JSON.stringify({
		gotTask : false
	});

	if (currTask != null) {
		myLogs("Sending task to Robot");
		post_data = JSON.stringify({
			gotTask : true,
			taskId : currTask.idT,
			taskDes : currTask.desTask,
		});
	}
	res.write(post_data);
	res.end();
});

// Quit on Escape, q, or Control-C.
screen.key([ 'escape', 'q', 'C-c' ], function(ch, key) {
	return process.exit(0);
});

screen.render();

function PostObject(post_data, ip_addr) {
	// An object of options to indicate where to post to

	var post_options = {
		host : ip_addr,
		port : '5000',
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
			// clean the queue......
			// myLogs('Response: ' + chunk);
		});
	});

	post_req.on('error', function(e, post_data) {
		myLogs("Problem with sending" + post_data);
	});

	post_req.write(post_data);
	post_req.end();
}

// functions for receiving messages
function receiveMsg(the_body) {
	// get the type of message being sent this can be either
	// a request to add a task or result to the list
	// addTask
	// addResult
	// getTask
	// getResult
	// outStop

	// note when sensor requests the task it needs to send the id of the bay
	// it is connected to i.e. 1, 2, or 3
	var msgType = the_body.message;
	var msgAddress = the_body.ipAddress;
	var msgSender = the_body.idSender;

	if (msgType == "addTask") {

		var tDes = the_body.description;
		var taskId = currBag.outTask(msgSender, tDes);
		// send the task with it's id and description back to the requester

		var post_data = querystring.stringify({
			taskId : taskId,
			taskDes : tDes
		});

		PostObject(post_data, msgAddress);

	} else if (msgType == "addResult") {
		var tDes = the_body.description;
		var idResult = parseInt(the_body.id);

		if (msgSender == "robot") {

			currBag.outResult("robot", 0, idResult, tDes);

		} else if (msgSender == "sensor") {

			var sRead = parseInt(the_body.sensorReading);
			currBag.outResult("sensor", sRead, idResult, tDes)
		}

	} else if (msgType == "outStop") {

		var result = currBag.outStop(msgSender);

		if (!result) {
			myLogs("Error: entity other then supervisor tried to add stop to bag")
		}

	} else if (msgType == "getTask") {

		// get the first available task for your type i.e. either robot or
		// sensor
		if (msgSender == "robot") {
			var currTask = currBag.inTask("robot");

			if (currTask != null) {
				// send message back with task information
				var post_data = querystring.stringify({
					taskId : currTask.idT,
					taskDes : currTask.desTask,
				});

				// send the task with it's id and description back to the
				// requester
				PostObject(post_data, msgAddress);
			}

		} else if (msgSender == "sensor") {

			// get the bay id for this sensor
			var bayId = parseInt(the_body.bayId);

			var currTask = currBag.inTaskSensor("sensor", bayId);

			if (currTask != null) {

				var post_data = querystring.stringify({
					taskId : currTask.idT,
					taskDes : currTask.desTask,
				});

				// send the task with it's id and description back to the
				// requester
				PostObject(post_data, msgAddress);
			}

		}

	} else if (msgType == "getResult") {

		// only available for robot and supervisor
		// remove the result from the list for the id sent with the message
		// if the result exists
		var result = currBag.inResult(msgSender, parseInt(the_body.id));

		if (result != null) {
			var post_data = querystring.stringify({
				resultId : result.idR,
				resultDes : result.desResult,
				resultReading : result.sensorReading,
			});

			// send the task with it's id and description back to the requester
			PostObject(post_data, msgAddress);

		}
	}

}

process.on('uncaughtException', function(err) {
	myLogs('Caught exception: ' + err);
});