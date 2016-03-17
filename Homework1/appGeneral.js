var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "192.168.0.103";


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

app.set('port', process.env.PORT || 4000);

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
box.setContent('This node is  ' + my_ip + '  East');
screen.render();


function PostObject(post_data,ip_addr) {
    // An object of options to indicate where to post to
    
    console.log('problem with request: ' + post_data);
    var post_options = {
        host: ip_addr,
        port: '4000',
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

        // console.log("trying ......") ;
        // if(Buffer.byteLength(querystring.stringify(post_data)) > 0)
        //{ 
        //console.log("posting again!!!!!");
        //console.log('problem with request: ' + post_data);
        PostObject(querystring.stringify(post_data));
        //}
    });

    post_req.write(post_data);
    post_req.end();
}



// handle POST requests
app.post('/do_post', function(req, res) {
    console.log(req);
	console.log(req.body);

    
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