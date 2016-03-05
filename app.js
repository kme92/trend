require('newrelic');

global.env = {tracker:'reddit', lastInit: new Date(), trends: []}; // initializing global environment object & the tracked string

var url = require("url"),
express  = require('express'),
bodyParser = require('body-parser'),
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
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

server.listen(process.env.PORT || 8080);

var util = require('util'),
twitter = require('twitter');
var twit = new twitter({
consumer_key: 'Vyj3FZxj5vXXU52kxOgF1XTl4',
consumer_secret: 'zRuYvqjoLN49HMXhXHzzt9lPccPUZU9i7jGlfoAHqZFcqyPqY4',
access_token_key: '862470176-GsUOX29rM9M7pxVahZ1v4NR4UrkRQDwFzlSefI30',
access_token_secret: 'ZlP7lCaaLBqLzaPX0NlbneiVQ9vYf1LflnDMp4Ev2IGKy'
});


//implementing currently trending in side bar
getTrends();
setInterval(function(){
	getTrends();
	}, 60000*10);

io.sockets.on("connection", function (socket) {
	pushTrends(socket);
	setInterval(function(){
		pushTrends(socket);
		}, 60000*10);
});

function getTrends(){
	twit.get('/trends/place.json', {include_entities:false, id: 1}, function(data, res) {
	    global.env.trends = data;
	});
	}

function pushTrends(socket)
	{
	socket.emit("trends", global.env.trends);
	}

initialize(global.env.tracker);

function initialize(tracker){
	if(twit.currentStream)
		{
		twit.currentStream.destroy();
		}
	global.env.tracker = tracker;
MongoClient.connect(uristring, function (err, db) { 
	
	//volume by language aggregation
	
	db.collection('languageVolumeCount', function (err, collection) {
		if(err)
			{
			process.exit(1);
			}
		
		collection.drop(function(err, result) {
			if (err != null)
				console.log(err);
			db.createCollection('languageVolumeCount', function(err, collection) {
				if(err)
					{
					console.log(err);
					}
				
				startLanguageVolumeServer(collection);
							    
			});
		});
    });
	
	//volume by source aggregation

	db.collection('sourceVolumeCount', function (err, collection) {
		if(err)
			{
			process.exit(1);
			}
		
		collection.drop(function(err, result) {
			if (err != null)
				console.log(err);
			db.createCollection('sourceVolumeCount', function(err, collection) {
				if(err)
					{
					console.log(err);
					}
				
				startSourceVolumeServer(collection);
							    
			});
		});
    });
	
	
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
				    console.log ("successful initialization: " + global.env.tracker);
				    twit.stream('user', {track: global.env.tracker}, function(stream) {
				    var index = 1;
				    stream.on('data', function(data) {
				    	twit.currentStream = stream;
				    	if(data != null && data.source != undefined  && data.text != undefined){ 
				    		data.source = data.source.replace(/<(?:.|\n)*?>/gm, '');
				    	/*db.collection('feed', function(err, collection) {
				               collection.insert({
				            	   'index': index,
				            	   'data': data.text, 
				            	   'date': new Date(data.created_at),
				            	   'lang': data.lang,
				            	   'source': data.source
				            	   }, {safe:true}
				                                 , function(err, result) {
				                                	 if(err==null)
				                                		 {
				                                		 index++;
				                                		 }
			                                		 });
			    	});*/
				    }
				    	 
				    aggregateVolume(db, data);
				    aggregateSourceVolume(db, data);
				    aggregateLanguageVolume(db, data);
				    });
				    });
				
				    //startFeedServer (collection);
				}); 
			});
		});
    });
	
});
}

function aggregateVolume(db, data)
	{
	var creationDate = new Date(data.created_at);
	var hour = creationDate.getHours(),
	minute = creationDate.getMinutes(),
	second = creationDate.getSeconds();
	
	db.collection('volumeCount', function (err, collection) {
		
		// can't use elemMatch due to limitations of MongoDB 
		// see: https://jira.mongodb.org/browse/SERVER-831
		//"minutes": {$elemMatch: {"minute": minute}}
		
		// MongoDB workaround
		var secondQuery = "minutes." + minute + ".seconds." + second + ".secondVolume";
		var minuteQuery = "minutes." + minute + ".minuteVolume";
		var incrementOb = {};
		incrementOb["hourVolume"] = 1;
		incrementOb[minuteQuery] = 1;
		incrementOb[secondQuery] = 1;
		
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

function aggregateSourceVolume(db, data)
{
var source = data.source;
if(source != null){
db.collection('sourceVolumeCount', function (err, collection) {
	
	collection.update({"source": source},
			    {$inc: {"count": 1}},
		    {upsert:true,safe:true},
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
}
};

function startSourceVolumeServer (collection) {
    io.sockets.on("connection", function (socket) {
	setInterval(function(){
		readAndSendSourceVolume(socket, collection);
		}, 5000);
    });
};

function readAndSendSourceVolume (socket, collection) {
    collection.find({}, {"limit": 10, "sort": [["count", -1]]}).toArray(function(err, docs)
    		{
    		socket.emit("sourceVolume", docs);
    		});
	
};


//language volume code

function aggregateLanguageVolume(db, data)
{
var lang = data.lang;
if(lang != null){
db.collection('languageVolumeCount', function (err, collection) {
	
	collection.update({"lang": lang},
			    {$inc: {"count": 1}},
		    {upsert:true,safe:true},
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
}
};

function startLanguageVolumeServer (collection) {
    io.sockets.on("connection", function (socket) {
	setInterval(function(){
		readAndSendLanguageVolume(socket, collection);
		}, 5000);
    });
};

function readAndSendLanguageVolume (socket, collection) {
    collection.find({}, {"limit": 10, "sort": [["count", -1]]}).toArray(function(err, docs)
    		{
    		socket.emit("languageVolume", docs);
    		});
	
};


/*function startFeedServer (collection) {
    io.sockets.on("connection", function (socket) {
	readAndSendFeed(socket, collection);
    });
};

// example tweets. does not send full volume (sends one every 0.3s)
function readAndSendFeed (socket, collection) {
    collection.find({}, {"tailable": 1, "sort": [["$natural", 1]]}, function(err, cursor) {
	cursor.intervalEach(1000, function(err, item) { 
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
};*/

var actions = {initialize: initialize};

require('./app/routes.js')(app, actions);
