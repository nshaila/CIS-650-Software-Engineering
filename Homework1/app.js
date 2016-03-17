var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var election_on = 1;
var election_off = 0;

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

app.set('port', process.env.PORT || 3000);

var mac_id = "b8:27:eb:dd:4c:ce";

var my_group = ["192.168.0.101", "192.168.0.103", "192.168.0.104", "192.168.0.106"]; // replace with real IPs of group

var my_index = 1; // replace with index of my IP in my_group

box.setContent('this node (' + my_group[my_index] + ') will attempt to send its token to other nodes on network. ');
screen.render();


var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var num = 0;
var count = 0;
var leader_id = mac_id;
var leader_count = 0;
var commandLineArgs = process.argv.slice(2);
var delay = parseInt(commandLineArgs[0]);
var prime_timer = 5000 - delay;
var sent = false;
var pendingQueue = "";
var initialize = 5000;


setTimeout(startFunc, initialize);

box.setContent('This node is  ' + my_ip + '  East');
screen.render();

function startFunc() {
    primeNumbers(3, 2, prime_timer);
}

function PostObject(post_data) {
    // An object of options to indicate where to post to

    // console.log('problem with request: ' + pendingQueue);
    var post_options = {
        host: my_group[my_index + 1],
        port: '3000',
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

function addDelay(callno, the_body) {

    if (callno == 1)
        checkForLeader(the_body);

    else if (callno == 2)
        updateLeader(the_body);

}

function changeColor(message, box_color) {
    box.setContent(message);
    box.style.bg = box_color;
    screen.render();
}

// handle POST requests
app.post('/do_post', function(req, res) {
    var the_body = req.body;
    //console.log("check" + req);
    //console.log("Recieved: " + the_body.election + " Count : " + the_body.c );

    if (the_body.election != null && parseInt(the_body.election) == 1) {

        var color = 'red';
        var message = "Chenking for leader\n Leader " + the_body.id + "\nCount: " + the_body.c;
        setTimeout(changeColor(message, color), 1000);
        //console.log("check For Leader");
        //setTimeout(addDelay(1, the_body), delay);
        checkForLeader(the_body);

    }

    if (the_body.election != null && parseInt(the_body.election) == 0) {
        var color = 'blue';
        var message = " Election Over Updating Leader \n Leader " + the_body.id + "\nCount: " + the_body.c;
        setTimeout(changeColor(message, color), 1000);
        //console.log("update leader");
        //setTimeout(addDelay(2, the_body), delay);
        updateLeader(the_body);
    }

    res.json({
            "body": the_body,
            "id": JSON.stringify(my_group[my_index])
        });

});



function updateLeader(body) {
    var r_id = body.id;
    var r_count = parseInt(body.c);

    leader_id = r_id;
    leader_count = r_count;

    if (leader_count != count) {
        //console.log("Posting leader message" +leader_id);
        //console.log("Posting leader message count" +leader_count);
        var post_data1 = querystring.stringify({
                election: election_off,
                id: leader_id,
                c: leader_count
            });

        PostObject(post_data1);
    } else {

        var color = 'green';
        var message = " Election Over \n I am the leader \n Leader " + leader_id + "\nCount: " + leader_count;
        setTimeout(changeColor(message, color), 1000);
        //console.log("I Win I suck!!!!!!");
    }

}


function checkForLeader(body) {

    var r_id = body.id;
    var r_count = parseInt(body.c);

    if (r_count == count) {
        leader_id = mac_id;
        leader_count = r_count;
        //console.log("Posting that I am leader");
        var post_data2 = querystring.stringify({
                election: election_off,
                id: leader_id,
                c: leader_count
            });

        PostObject(post_data2);
        return;
    }


    if (r_count > leader_count) {
        leader_id = r_id;
        leader_count = r_count;
        var post_data3 = querystring.stringify({
                election: election_on,
                id: leader_id,
                c: leader_count
            });

        PostObject(post_data3);
    }

}

function alertFunc() {
    var post_data4 = querystring.stringify({
            election: election_on,
            id: mac_id,
            c: count
        });
    leader_count = count;
    console.log("Sending Count:" + leader_count);
    PostObject(post_data4);
}



function primeNumbers(n, c, k_milli) {

    setTimeout(alertFunc, k_milli);
    num = n;
    count = c;
    var prevTime = (new Date()).getTime();
    var status = 1;

    var dt = 0;
    var curr = 0;
    /* while (dt <= delay) {
        curr = (new Date()).getTime();
        dt = curr - prevTime;
    }*/

    while (1) {
        var curTime = (new Date()).getTime();
        var deltaTime = curTime - prevTime;
        if (deltaTime > k_milli)
            break;
        var j = 2;
        for (j = 2; j <= Math.sqrt(num); j++) {
            if (num % j == 0) {
                status = 0;
                break;
            }
        }
        if (status != 0) {
            count++;
        }
        status = 1;
        num++;
    }
}

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
