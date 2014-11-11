require('newrelic');

var url = require("url"),
express  = require('express'),
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
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
require('./app/routes.js')(app);

server.listen(process.env.PORT || 8080);


var util = require('util'),
twitter = require('twitter');
var twit = new twitter({
consumer_key: 'Vyj3FZxj5vXXU52kxOgF1XTl4',
consumer_secret: 'zRuYvqjoLN49HMXhXHzzt9lPccPUZU9i7jGlfoAHqZFcqyPqY4',
access_token_key: '862470176-GsUOX29rM9M7pxVahZ1v4NR4UrkRQDwFzlSefI30',
access_token_secret: 'ZlP7lCaaLBqLzaPX0NlbneiVQ9vYf1LflnDMp4Ev2IGKy'
});

MongoClient.connect(uristring, function (err, db) { 
	
	//volume count aggregation
	
	db.collection('volumeCount', function (err, collection) {
		if(err)
			{
			process.exit(1);
			}
	
		// too much nesting??
		
		collection.drop(function(err, result) {
			if (err != null)
				console.log(err);
			db.createCollection('volumeCount', function(err, collection) {
				
				/*var ob = {};
			    for(var hour = 0; hour < 24; hour++)
			    	{
			    	var hr = hour.toString();
			    	ob[hr] = {};
			    	for(var minute = 0; minute < 60; minute++)
			    		{
			    		var min = minute.toString();
			    		ob[hr][min] = {};
			    		for(var second = 0; second < 60; second++)
			    			{
			    			var sec = second.toString();
			    			ob[hr][min][sec] = 0;
			    			}
			    		}
			    	}*/
				
				for(var hour = 0; hour < 24; hour++)
		    	{
				var hourOb = {};
				hourOb["hour"] = hour;
				hourOb.minutes = new Array();
				hourOb.hourVolume = 0;
		    	for(var minute = 0; minute < 60; minute++)
		    		{
		    		var minuteOb = {}
		    		minuteOb["minute"] = minute;
		    		minuteOb.minuteVolume = 0;
		    		minuteOb.seconds = new Array();
		    		hourOb.minutes[minute] = minuteOb;
		    		for(var second = 0; second < 60; second++)
		    			{
		    			var secondOb = {}
		    			secondOb["second"] = second;
		    			secondOb.secondVolume = 0;
		    			minuteOb.seconds[second] = secondOb;
		    			}
		    		}

		    	 db.collection('volumeCount', function(err, collection) {
		               collection.insert(hourOb, {safe:true}, function(err, result)
		            		   {
		            	   		// mandatory callback
		            	       if (err)
		            			   {throw err;}
		            	       else
		            	    	   {
		            	    	   }
		            		   });
		    	 });
		    	}
				startVolumeServer(collection);
							    
			});
		});
    });
		
	
	
	// feed storage
	
	db.collection('feed', function (err, collection) {
		if(err)
			{
			process.exit(1);
			}
	
		collection.drop(function(err, result) {
			db.createCollection('feed', {'capped':true, 'size':8000000, 'max': 10000}, function(err, collection) {
			    assert.equal('feed', collection.collectionName);
		
			    collection.options(function(err, options) {
			      assert.equal(true, options.capped);
			      assert.ok(options.size >= 8000000);
			      assert.ok(options.max == 10000);
			    	});
			    
				collection.isCapped(function (err, capped) { 
				    if (err) {
					console.log ("err: unable to get capped collection");
					process.exit(2);
				    }
				    if (!capped) {
					console.log ("err: uncapped collection");
					process.exit(3);
				    }
				    console.log ("successful initialization");
				    twit.stream('user', {track:'obama'}, function(stream) {
				    var index = 1;
				    stream.on('data', function(data) {
				    	//console.log(util.inspect(data));
				    	if(data != null && data.text != null){ 
				    	db.collection('feed', function(err, collection) {
				               collection.insert({
				            	   'index': index,
				            	   'data': data.text, 
				            	   'date': new Date(data.created_at),
				            	   'lang': data.lang
				            	   }, {safe:true}
				                                 , function(err, result) {
				                                	 if(err==null)
				                                		 {
				                                		 index++;
				                                		 }
			                                		 });
			    	});
				    }
				    	 
				    aggregateVolume(db, data);
				    });
				    });
				
				    startFeedServer (collection);
				}); 
			});
		});
    });
	
});

function aggregateVolume(db, data)
	{
	var creationDate = new Date(data.created_at);
	var hour = creationDate.getHours(),
	minute = creationDate.getMinutes(),
	second = creationDate.getSeconds();
	
	db.collection('volumeCount', function (err, collection) {
		
		var secondQuery = "minutes." + minute + ".seconds." + second + ".secondVolume";
		var minuteQuery = "minutes." + minute + ".minuteVolume";
		var incrementOb = {};
		incrementOb["hourVolume"] = 1;
		incrementOb[minuteQuery] = 1;
		incrementOb[secondQuery] = 1;
		//console.log(util.inspect(incrementOb));
		
		/*"minutes": {$elemMatch: {"minute": minute}}*/
		
		collection.update({"hour": hour},
				    {$inc: incrementOb},
			    {upsert:false,safe:true},
			    function(err,data){
			        if (err){
			            console.log(err);
			        }
			        else
			        	{
			        	//console.log(util.inspect(data));
			        	}
			    }
			);
	});
	};

function startVolumeServer (collection) {
    io.sockets.on("connection", function (socket) {
	setInterval(function(){
		readAndSendVolume(socket, collection);
		}, 1000);
    });
};

function readAndSendVolume (socket, collection) {
	var currentDate = new Date();
	currentDate = new Date(currentDate.getTime() - 5000); // add a 5 second delay (we do need some time to process data!)
	var hour = currentDate.getHours(),
	minute = currentDate.getMinutes(),
	second = currentDate.getSeconds();

	collection.aggregate([
	    { $match: {"hour": hour}},
	    {$unwind: "$minutes"},
	    {$match: {"minutes.minute": minute}},
	    {$unwind: "$minutes.seconds"},
	    {$match: {"minutes.seconds.second": second}}
	    	], function(err, result) {
		if (err){
            console.log(err);
		}
		else
			{
			//console.log(util.inspect(result));
			socket.emit("volume", result);
			}
        });
	
};

function startFeedServer (collection) {
    io.sockets.on("connection", function (socket) {
	readAndSendFeed(socket, collection);
    });
};

// example tweets. does not send full volume (sends one every 0.3s)
function readAndSendFeed (socket, collection) {
    collection.find({}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(300, function(err, item) { 
	    if(item != null && item.data != null) {
		socket.emit("all", item); // sends to clients subscribed to type all
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
	    // Fetch the next object until there are no more objects
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


