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

//get my ip
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
//function for UI ..
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


app.get('/', function(req, res){
  res.sendFile(__dirname + '/factory.html');
});

io.on('connection', function(socket){
  myLogs('a user connected');
  socket.emit('news', {
		hello : 'world'
	});
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


app.post('/do_post', function(req, res) {
	var the_body = req.body;

	res.json({
		"body" : the_body,
		"ip" : JSON.stringify(my_ip)
	});

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
			// console.log('Response: ' + chunk);
		});
	});

	post_req.on('error', function(e, post_data) {
		console.log("Problem with sending" + post_data);
	});

	post_req.write(post_data);
	post_req.end();
}

process.on('uncaughtException', function(err) {
	myLogs('Caught exception: ' + err);
});