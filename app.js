
var url = require("url"),
emitter = require("events").EventEmitter,
mongo = require("mongodb"),
Cursor = mongo.Cursor,
MongoClient = mongo.MongoClient,
assert = require("assert");

var uristring = process.env.MONGOLAB_URI || "mongodb://admin:admin@ds051170.mongolab.com:51170/heroku_app31104561"; 
var mongoUrl = url.parse (uristring);

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(process.env.PORT || 2000);

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
	//tracking obama for now
});

MongoClient.connect(uristring, function (err, db) { 
	//console.log(err);
	
	db.collection('feed', function (err, collection) {
		if(err)
			{
			process.exit(1);
			}
	
		collection.drop(function(err, result) {
			db.createCollection('feed', {'capped':true, 'size':8000000, 'max': 10000}, function(err, collection) {
			    //assert.ok(collection instanceof Collection);
			    assert.equal('feed', collection.collectionName);
		
			    collection.options(function(err, options) {
			      assert.equal(true, options.capped);
			      assert.ok(options.size >= 8000000);
			      assert.ok(options.max == 10000);
			    	});
			    
				collection.isCapped(function (err, capped) { 
				    if (err) {
					console.log ("error getting capped collection");
					process.exit(2);
				    }
				    if (!capped) {
					console.log ("uncapped collection");
					process.exit(3);
				    }
				    console.log ("success connecting");
				    twit.stream('user', {track:'obama'}, function(stream) {
				    var index = 1;
				    stream.on('data', function(data) {
				    	 db.collection('feed', function(err, collection) {
				               collection.insert({'data': data.text, 'index': index}, {safe:true}
				                                 , function(err, result) {
				                                	 if(err==null)
				                                		 {
				                                		 index++;
				                                		 }
			                                		 });
			    	});
				    });
				    });
				
				    startIOServer (collection);
				}); 
			});
		});
    });
});

function startIOServer (collection) {
    io.sockets.on("connection", function (socket) {
	readAndSend(socket, collection);
    });
};

function readAndSend (socket, collection) {
    collection.find({}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(300, function(err, item) { 
	    if(item != null) {
		socket.emit("all", item); // sends to clients subscribed to type "all"
	    }
	});
    });
    /*collection.find({"feedtype":"complex"}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(900, function(err, item) {
	    if(item != null) {
		socket.emit("complex", item); // sends to clients subscribe to type "complex"
	    }
	});
    });*/
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


