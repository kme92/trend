var socket = io.connect('/');

//require(['dojo/dom', 'dojo/date/locale', 'dojo/domReady!'], function(dom) {


//	    function dateFormat(date, format) { return dojo.date.locale.format( date, {selector: 'date', datePattern:format });}
	    function strip_id(key, value)  { return key == '_id' ? undefined : value; }

	
socket.on('all', function (data) {
	
document.getElementById('console').innerHTML = '<pre> data: ' + JSON.stringify(data, strip_id, 2) + '</pre>'; 
});
/*onefour = dom.byId('onefour');
onefour.innerHTML = '<pre> data: ' + JSON.stringify(data, strip_id, 2) + '</pre>'; 
});*/

function pingServer(socket)
	{
	console.log('pinging server at: ' + new Date());
	socket.emit('ping');
	}

setInterval(function ()
	{
	pingServer(socket);
	}, 15000);
	    
//	    });
