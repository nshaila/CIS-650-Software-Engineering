var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var election_on = 1;
var election_off = 0;
var my_ip = "192.168.0.103";
var ipLock = "";
var available = 1;
var current_count = 0;
var current_ip = "";
var lock_ip = "192.168.0.101";


app.use(bodyParser.urlencoded());

// Create a screen object.
var screen = blessed.screen();
// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
    top: 'center',
    left: 'center',
    width: '75%',
    height: '75%',
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

// Append our box to the screen.
screen.append(box);

app.set('port', process.env.PORT || 5000);

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
box.setContent('This node is  ' + my_ip + '  Var');
screen.render();


function PostObject(post_data, ip_addr) {
    // An object of options to indicate where to post to    
    var post_options = {
        host: ip_addr,
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
        console.log('Problem with sending: ' + post_data);
    });

    post_req.write(post_data);
    post_req.end();
}

function sendCurrentCount(num, recipient) {

    var post_data = querystring.stringify({
        count: num,
        read: 1,
        ip: recipient
    });

    PostObject(post_data, recipient);
}

// handle POST requests
app.post('/do_post', function(req, res) {

    var the_body = req.body;

    if (the_body !== null && the_body.read !== null && parseInt(the_body.read) === 0) {
        var ip = the_body.ip;
        sendCurrentCount(current_count, ip);
        box.setContent("Sending Count!" + current_count);
        screen.render();
    } else if (the_body !== null && the_body.writereq !== null && parseInt(the_body.writereq) === 0) {
        current_count = parseInt(the_body.count);
        box.insertBottom("Count updated !" + current_count);
        screen.render();
    }
    res.json({
        "body": the_body,
        "ip": JSON.stringify(current_ip)
    });

});


// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function() {
    // console.log("Express server listening on port " + app.get('port'));
});