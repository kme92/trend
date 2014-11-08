var socket = io.connect('/');
pingServer(socket); //initial ping - heroku will close connection if no ping within 30s of connection
function strip_id(key, value)  { return key == '_id' ? undefined : value; }

	
socket.on('all', function (data) {
	document.getElementById('console').innerHTML = '<pre> data: ' + JSON.stringify(data, strip_id, 2) + '</pre>'; 
});


function pingServer(socket)
	{
	console.log('pinging server at: ' + new Date());
	socket.emit('ping');
	}


// ping server every 30s (heroku timeout is 55s)
setInterval(function ()
	{
	pingServer(socket);
	}, 30000);
	    
