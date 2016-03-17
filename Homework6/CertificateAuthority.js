var os = require('os');
var crypto = require('crypto');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var my_ip = "128.223.4.35";
var Discover = require('node-discover');

var numNodesInsecureChannel = 0;
var numNodesOnSecureChannel = 0;
//fake mac addresses and public keys which can be replaced later 
var validNodes = [];
var validMacAddresses = ["abc", "def", "ghi", "jkl"];

var myPublicKey = "publicCA.pub";
var myPrivateKey = "privateCA.pem";

var validPublicKeys = ["pubN1.pub", "pubN2.pub", "pubN3.pub", "pubCS.pub"];
var fs = require('fs');
var ursa = require('ursa');


var dictNodes = {
    "abc": "pubN1.pub", //101
    "def": "pubN2.pub", //103
    "ghi": "pubN3.pub" //104
}

var sharedKeyWithCS = "123456789";

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
        parent: screen,
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        align: 'center',
        fg: 'blue',
        border: {
            type: 'line'
        },
        //selectedBg: 'white',
        selectedBold: true,
        mouse: true,
        keys: true,
        vi: true
    });


list.prepend(new blessed.Text({
            left: 2,
            content: ' This node is ' + my_ip
        }));



var logCount = 0;

function myLogs(log) {
    list.add("" + log);
    list.focus();
    list.select(logCount++);
    screen.render();
}

app.set('port', process.env.PORT || 4000);

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');

screen.render();

function PostObject(post_data, sendto) {
    // An object of options to indicate where to post to   
    // console.log('problem with request: ' + pendingQueue);
    var post_options = {
        host: sendto,
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

        });
    });

    post_req.on('error', function(e, post_data) {
        console.log("Error connecting");
    });

    post_req.write(post_data);
    post_req.end();
}


// handle POST requests
app.post('/do_post', function(req, res) {
    //console.log("Received Message");
    var the_body = req.body;

    receiveMessageWorker(the_body);

    res.json({
            "body": the_body,
            "id": JSON.stringify(my_ip)
        });

});


function receiveMessageWorker(data) {

    var key = ursa.createPrivateKey(fs.readFileSync('privateCA.pem'));
    var msgReceived = key.decrypt(data.message.toString('base64'), 'base64', 'utf8');
    

    var macAddress = msgReceived.substring(0, 3);
    var ipAddress = msgReceived.substring(4);
	myLogs("decrypted " + macAddress);
	myLogs("decrypted ipAddress " + ipAddress);
    var isValid = false;
    for (var i = 0; i < validMacAddresses.length; i++) {
        if (validMacAddresses[i].localeCompare(macAddress) == 0) {
            isValid = true;
        }
    }



    if (isValid) {
    	myLogs("sending key .." );
        var cert = ursa.createPublicKey(fs.readFileSync(dictNodes[macAddress]));
        var encryptKey = cert.encrypt(sharedKeyWithCS, 'utf8', 'base64');

        var post_data = querystring.stringify({
                 key: encryptKey
            });
       PostObject(post_data,ipAddress);

    }

}




// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

screen.render();

http.createServer(app).listen(app.get('port'), function() {
    myLogs("Express server listening on port " + app.get('port'));
});
process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});