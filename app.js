
var fs = require("fs"), 
url = require("url"),
emitter = require("events").EventEmitter,
assert = require("assert"),

mongo = require("mongodb"),
Cursor = mongo.Cursor;

// Heroku-style environment variables
var uristring = process.env.MONGOLAB_URI || "mongodb://heroku_app31103832:xxxx@ds047950.mongolab.com:47950/heroku_app31103832"; 
var mongoUrl = url.parse (uristring);

//
// Start http server and bind the socket.io service
//
var app = require("http").createServer(handler), // handler defined below
io = require("socket.io").listen(app);

theport = process.env.PORT || 2000;
app.listen(theport);
console.log ("http server on port: " + theport);

function handler (req, res) {
  fs.readFile(__dirname + "/index.html",
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end("Error loading index.html");
    }
    res.writeHead(200);
    res.end(data);
  });
}

//
// Open mongo database connection
// A capped collection is needed to use tailable cursors
//
mongo.MongoClient.connect (uristring, function (err, db) { 
    console.log ("Attempting connection to " + mongoUrl.protocol + "//" + mongoUrl.hostname + " (complete URL supressed).");
    db.collection ("messages", function (err, collection) {
	collection.isCapped(function (err, capped) { 
	    if (err) {
		console.log ("Error when detecting capped collection.  Aborting.  Capped collections are necessary for tailed cursors.");
		process.exit(1);
	    }
	    if (!capped) {
		console.log (collection.collectionName + " is not a capped collection. Aborting.  Please use a capped collection for tailable cursors.");
		process.exit(2);
	    }
	    console.log ("Success connecting to " + mongoUrl.protocol + "//" + mongoUrl.hostname + ".");
	    startIOServer (collection);
	});
    });
});

//
// Bind send action to "connection" event
//
function startIOServer (collection) {
    console.log("Starting ...");

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
    collection.find({"messagetype":"complex"}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(900, function(err, item) {
	    if(item != null) {
		socket.emit("complex", item); // sends to clients subscribe to type "complex"
	    }
	});
    });
};
	

// Duck-punching mongodb driver Cursor.each.  This now takes an interval that waits 
// "interval" milliseconds before it makes the next object request... 
Cursor.prototype.intervalEach = function(interval, callback) {
    var self = this;
    if (!callback) {
	throw new Error("callback is mandatory");
    }

    if(this.state != Cursor.CLOSED) {
	//FIX: stack overflow (on deep callback) (cred: https://github.com/limp/node-mongodb-native/commit/27da7e4b2af02035847f262b29837a94bbbf6ce2)
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


