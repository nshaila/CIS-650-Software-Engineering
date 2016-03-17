var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "192.168.0.101";
var ipLock = "";
var available = 1;
var local = "127.0.0.1";

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
box.setContent('This node is  ' + my_ip + '  Lock');
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

// handle POST requests
app.post('/do_post', function(req, res) {
    var the_body = req.body;

    var sender_ip = the_body.ip;
    var msg_type = parseInt(the_body.lock);  

    if (msg_type === 1) {
        box.setContent("Received a request for the lock ");
        if (available === 1) {
            box.insertBottom("lock is available for " + sender_ip);
            screen.render();
            available = 0;
            ipLock = sender_ip;
            var post_data = querystring.stringify({
                acquired: 1
            });
            //console.log("acquired " + sender_ip + " lock" );
            //console.log("sending message to " + sender_ip + "that they aquired lock")
            PostObject(post_data, sender_ip);

        } else if (available === 0) {

            box.insertBottom("lock is unavailable " + sender_ip);
            screen.render();
            var post_data = querystring.stringify({
                aquired: 0
            });

            PostObject(post_data, sender_ip);

        }
    } else if (msg_type === 0) {
        box.insertBottom("Relasing Lock");
        available = 1;
        ipLock = "";
    }

    res.json({
        "body": the_body,
        "ip": JSON.stringify(my_ip)
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
    console.log("Express server listening on port " + app.get('port'));
});