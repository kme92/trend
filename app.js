
var url = require("url"),
emitter = require("events").EventEmitter,
mongo = require("mongodb"),
Cursor = mongo.Cursor,
MongoClient = mongo.MongoClient,
assert = require("assert");

// Heroku-style environment variables
var uristring = /*add back once database configured*//*process.env.MONGOLAB_URI ||*/ "mongodb://serveradmin:welcome@ds047950.mongolab.com:47950/heroku_app31103832"; 
var mongoUrl = url.parse (uristring);

//
// Start http server and bind the socket.io service
//
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(2000);

app.get('/', function (req, res) {
	  res.sendFile(__dirname + '/index.html');
	});


var util = require('util'),
twitter = require('twitter');
var twit = new twitter({
consumer_key: 'Vyj3FZxj5vXXU52kxOgF1XTl4',
consumer_secret: 'zRuYvqjoLN49HMXhXHzzt9lPccPUZU9i7jGlfoAHqZFcqyPqY4',
access_token_key: '862470176-GsUOX29rM9M7pxVahZ1v4NR4UrkRQDwFzlSefI30',
access_token_secret: 'ZlP7lCaaLBqLzaPX0NlbneiVQ9vYf1LflnDMp4Ev2IGKy'
});

twit.stream('user', {track:'obama'}, function(stream) {
stream.on('data', function(data) {
    /*console.log(util.inspect(data));*/
});
// Disconnect stream after five seconds
//setTimeout(stream.destroy, 5000);
});

console.log("here");
MongoClient.connect(uristring, function (err, db) { 
	console.log(err);
    db.collection ("feed", function (err, collection) {
	collection.isCapped(function (err, capped) { 
	    if (err) {
		console.log ("error getting capped collection");
		process.exit(1);
	    }
	    if (!capped) {
		console.log ("uncapped collection");
		process.exit(2);
	    }
	    console.log ("success connecting");
	    startIOServer (collection);
	});
    });
});

//
// Bind send action to "connection" event
//
function startIOServer (collection) {
    io.sockets.on("connection", function (socket) {
	readAndSend(socket, collection);
    });
};

//
// Read and send data to socket.
// The real work is done here upon receiving a new client connection.
// Queries the database twice and starts sending two types of messages to the client.
// (known bug: if there are no documents in the collection, it doesn't work.)
//
function readAndSend (socket, collection) {
    collection.find({}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(300, function(err, item) { // intervalEach() is a duck-punched version of each() that waits N milliseconds between each iteration.
	    if(item != null) {
		socket.emit("all", item); // sends to clients subscribed to type "all"
	    }
	});
    });
    collection.find({"feedtype":"complex"}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(900, function(err, item) {
	    if(item != null) {
		socket.emit("complex", item); // sends to clients subscribe to type "complex"
	    }
	});
    });
};
	
Cursor.prototype.intervalEach = function(interval, callback) {
    var self = this;
    if (!callback) {
	throw new Error("callback is mandatory");
    }

    if(this.state != Cursor.CLOSED) {
	setTimeout(function(){
	    // Fetch the next object until there is no more objects
	    self.nextObject(function(err, item) {        
		if(err != null) return callback(err, null);

		if(item != null) {
		    callback(null, item);
		    self.intervalEach(interval, callback);
		} else {
		    // Close the cursor if done
		    self.state = Cursor.CLOSED;
		    callback(err, null);
		}

		item = null;
	    });
	}, interval);
    } else {
	callback(new Error("Cursor is closed"), null);
    }
};


