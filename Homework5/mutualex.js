var Discover = require('node-discover');
var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "";

var commandLineArgs = process.argv.slice(2);
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
// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
        bottom: 0,
        right: 0,
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
        top: 'center',
        left: 'center',
        width: '90%',
        height: '90%',
        border: {
            type: 'line'
        },
        keys: true,
        tags: true,
        top: 'center',
        left: 'center'
    });


var buttonRequest = blessed.button({
        parent: form,
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
        parent: form,
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

screen.append(box);

app.set('port', process.env.PORT || port);

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
box.setContent('This node is  ' + my_ip + '  East');
screen.render();


buttonRequest.on('press', function() {

    //increment our time stamp
    my_time = highest_time + 1;
   

    var success1 = d.send(master_ip, {
            Port: port,
            MessageType: messageType.request,
            TimeStamp: my_time,
            ipAddress: my_ip
        })

    if (!success1) {
        console.log("sending message failed");
    } else {
        currentState = states.WAIT;
    }

     if(numNodes == 0)
    {
        currentState = states.CRITICAL;
        replyQueue = [];
        currReply = 0;
        console.log("enter critical section");
    } 

});



buttonRelease.on('press', function() {
   // console.log("state" + currentState); 

    if(currentState !== states.CRITICAL)
        return;

    console.log("Release" + requestQueue.length);

    for (var i = 0; i < requestQueue.length; i++) {
        var msg = requestQueue[i];
        var tMessage = parseInt(msg.MessageType);
        var tTime = parseInt(msg.TimeStamp);
        var address = msg.ipAddress;
        console.log("sending to address" + address);

        var post_data = querystring.stringify({
                Port: port,
                ipAddress: my_ip,
                MessageType: messageType.response,
                TimeStamp: my_time,

            });
        PostObject(post_data, address);
    }
    currentState = states.GAP;
    replyQueue = [];
    requestQueue = [];



});



var d = new Discover({
        helloInterval: 3000,
        checkInterval: 4000,
        nodeTimeout: 4000,
        masterTimeout: 4000
    });

registerCallbacks();



function receivePostdata(data) {
    console.log("receivePostdata");
    var tMessage = parseInt(data.MessageType);
    var tTime = parseInt(data.TimeStamp);
    var address = data.ipAddress;
    console.log("receivePostdata" + address + "message type" + tMessage);
    if (replyQueue.length == (numNodes - 1)) {
        currentState = states.CRITICAL;
        replyQueue = [];
        currReply = 0;
        console.log("enter critical section");
    } else {
        console.log("queuing.... queue size is before adding " + replyQueue.length);
        replyQueue[currReply] = new message(messageType.response, tTime, data.ipAddress, data.Port);
        currReply++;
    }

}


function receiveMessage(data) {
    console.log("Received ");
    var tMessage = parseInt(data.MessageType);
    var tTime = parseInt(data.TimeStamp);
    var address = data.ipAddress;
    highest_time = tTime;
    console.log("Highest time updated" + highest_time);
    console.log("address:" + address);

    switch (currentState) {

        case states.GAP:
            {
                console.log("in  Gap State Sending Reply to " + address);

                var post_data = querystring.stringify({
                        Port: port,
                        ipAddress: my_ip,
                        MessageType: messageType.response,
                        TimeStamp: my_time
                    });
                PostObject(post_data, address);
            }
            break;


        case states.WAIT:
            {
                console.log("in  Wait State");

                if (tTime < my_time) {
                    //send reply 
                    console.log("tTime < my_time");
                    var post_data = querystring.stringify({
                            Port: port,
                            ipAddress: my_ip,
                            MessageType: messageType.response,
                            TimeStamp: my_time
                        });
                    PostObject(post_data, address);
                } else if (tTime > my_time) {
                    console.log("tTime > my_time so defer reply!!");
                    requestQueue[currRequest] = new message(messageType.request, tTime, data.ipAddress, data.Port);
                    currRequest++;
                } else if (tTime == my_time) {
                    console.log("tTime == my_time");
                    var res = address.split(".");
                    var r_ip=  parseInt(res[3]);
                    var res = my_ip.split(".");
                    var my_ip=  parseInt(res[3]);
                    if(my_ip > r_ip)
                     {
                       var post_data = querystring.stringify({
                            Port: port,
                            ipAddress: my_ip,
                            MessageType: messageType.response,
                            TimeStamp: my_time
                        });
                        PostObject(post_data, address);
                     }  
                     else
                     {
                        console.log("defer reply");
                        requestQueue[currRequest] = new message(messageType.request, tTime, data.ipAddress, data.Port);
                        currRequest++;
                     } 
                }
            }
            break;

        case states.CRITICAL:
            {
                console.log("in CRITICAL state");

                if (tMessage == messageType.request) {
                    if (highest_time < tTime) {
                        highest_time = tTime;
                    }
                    requestQueue[currRequest] = new message(messageType.request, tTime, address, data.Port);
                    currRequest++;
                    console.log("queue the request--");
                } else {
                    console.log("Error: received reply when it's not possible");
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
            console.log("could not join that channel; probably because it is reserved");
        }
    });

    d.on("demotion", function() {

    });

    d.on("added", function(obj) {

        numNodes++;
        console.log("Number of node" + numNodes);
    });

    d.on("removed", function(obj) {
        console.log("Number of node" + numNodes);
        numNodes -- ;
    });

    d.on("master", function(obj) {

        master_ip = obj.address;
        var success = d.join(master_ip, receiveMessage);
        if (!success) {
            console.log("slave could not join that channel; probably because it is reserved");
        }

    });

    d.eachNode(function(node) {});
}


function PostObject(post_data, address) {
    // An object of options to indicate where to post to

    console.log('Sending PostObject');
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
        console.log('problem with request: ' + post_data);

    });

    post_req.write(post_data);
    post_req.end();
}

app.get('/', function(request, response){
    response.sendfile('test.html');
});

// handle POST requests
app.post('/do_post', function(req, res) {
    console.log("app.post received" );

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

// Focus our element.
box.focus();

// Render the screen.
screen.render();

http.createServer(app).listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));


});