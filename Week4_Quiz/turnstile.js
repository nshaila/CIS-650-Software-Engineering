var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var screen = blessed.screen();
var querystring = require('querystring');
// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
  top: 'center',
  left: 'center',
  width: '100%',
  height: '100%',
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    },
    hover: {
      bg: 'black'
    }
  }
});

var form = blessed.form({
  parent: box,
  bottom: 0,
  right: 0,
  width: '50%',
  height: '50%',
  border: {
    type: 'line'
  },
  keys: true,
  tags: true,
  top: 'center',
  left: 'center'
});


var addPerson = blessed.button({
  parent: form,
  mouse: true,
  keys: true,
  shrink: true,
  top: 'center',
  left: 'center',
  width: '100%',
  height: '100%',
  name: 'addPerson',
  content: 'addPerson',
  
  style: {
    fg: 'white',
    bg: 'green',
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

// Append our box to the screen.
screen.append(box);

var lock_ip = "192.168.0.101";
var my_ip = "";
var var_ip = "192.168.0.103";

var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function(ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function(iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      console.log("skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses");
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log("here---" + ifname + ':' + alias, iface.address);
      my_ip = iface.address;
    } else {
      // this interface has only one ipv4 adress
      console.log("here" + ifname, iface.address);
      my_ip = iface.address;
    }
  });
});


box.setContent('This node is  ' + my_ip + '  East');
screen.render();

app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

function PostObject(post_data, sendto) {
  // An object of options to indicate where to post to   
  // console.log('problem with request: ' + pendingQueue);
  var post_options = {
    host: sendto,
    port: '5000',
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
    console.log("Error connecting");
  });

  post_req.write(post_data);
  post_req.end();
}



// handle GET requests
app.get('/do_get', function(req, res) {
  var the_body = req.query;
  console.log("get body: " + the_body.n);
  box.setContent("Get with query: " + the_body);
  box.style.bg = 'green'; //green for get
  screen.render();
  res.json({
    "query": the_body,
    "id": JSON.stringify(my_group[my_index])
  });
});

var poll;

// handle POST requests
app.post('/do_post', function(req, res) {
  //console.log("Received Message");
  var the_body = req.body;
  if (the_body !== null && parseInt(the_body.acquired) === 1) {
    box.insertBottom("Aquired Lock Sending Read request");
    screen.render();
    //clearInterval(poll);
    sendReadVar();
  } else if (the_body !== null && parseInt(the_body.acquired) === 0) {
    box.insertBottom("No lock, poll again");
    screen.render();
    // poll =  setInterval(pollagain ,  2000);
  } else if (the_body !== null && parseInt(the_body.read) === 1) {
    var n = parseInt(the_body.count);
    sendWrite(n);
  }

  res.json({
    "body": the_body,
    "id": JSON.stringify(my_ip)
  });

});


addPerson.on('press', function() {
  //console.log("Add person");  
  newPerson();
});


//newPerson();

//setInterval(newPerson, 3000);

function newPerson() {
  box.setContent("Getting Lock");
  var post_data1 = querystring.stringify({
    lock: 1,
    ip: my_ip
  });

  PostObject(post_data1, lock_ip);
}


function release() {
  box.insertBottom("Releasing Lock");
  screen.render();
  var post_data1 = querystring.stringify({
    lock: 0,
    ip: my_ip
  });

  PostObject(post_data1, lock_ip);
}

function sendReadVar() {

  var post_data1 = querystring.stringify({
    read: 0,
    ip: my_ip
  });

  //console.log("send Read to Var" + var_ip);          
  PostObject(post_data1, var_ip);

}

function sendWrite(n) {

  if (n === 4) {
    n = 0;
  } else {
    n = n + 1;
  }
  var post_data1 = querystring.stringify({
    writereq: 0,
    count: n,
    ip: my_ip
  });

  PostObject(post_data1, var_ip);
  box.insertBottom("Updating Count to " + n);
  screen.render();
  release();
}

// Focus our element.
addPerson.focus();

// Render the screen.
screen.render();

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

http.createServer(app).listen(app.get('port'), function() {
  // console.log("Express server listening on port " + app.get('port'));
});