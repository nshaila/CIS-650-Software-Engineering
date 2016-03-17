var Discover = require('node-discover');
var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "";
var private_key = "123456789";
var channelName = "critical";
var port = "4000";
var master_ip = "";
var states = {
    GAP : 0,
    CRITICAL : 1
};

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
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');

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
var d = new Discover({
    helloInterval : 1000,
    checkInterval : 2000,
    nodeTimeout : 2000,
    masterTimeout : 2000,
    key : private_key
});

registerCallbacks();

function receiveMessage(data) {

    if (typeof data !== "undefined" && data !== null) {

        switch (parseInt(data.MessageType)) {
        case messageType.enterCs:
            if (currState === states.GAP) {

                var address = data.ipAddress;
                myLogs(address + " is in critical");
                changeColor('red');
                currState = states.Critical;
            } else {
                myLogs("Rejecting request");
            }

            break;
        case messageType.leaveCs:
            if (currState === states.Critical) {

                var address = data.ipAddress;
                myLogs(address + " leaves critical");
                changeColor('green');
                currState = states.GAP;
            } else {
                myLogs("Rejecting request");
            }
            break;
        }

    } else {
        myLogs("message undefined");
    }
}

function registerCallbacks() {

    var success = d.join(channelName, receiveMessage);
    if (success) {
        myLogs("Channel Created");
    }

    d.on("added", function(obj) {

        if (typeof obj !== "undefined" && obj !== null) {
            myLogs("New Node Added", obj.address);
        } else
            myLogs(" Node Added ");
    });

    d.on("removed", function(obj) {
        if (typeof obj !== "undefined" && obj !== null) {
            myLogs("Node removed ", obj.address);
        } else
            myLogs("Node removed");
    });
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