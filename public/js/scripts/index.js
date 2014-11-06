require(['dojo/dom', 'dojo/date/locale', 'dojo/domReady!'], function(dom) {


	    function dateFormat(date, format) { return dojo.date.locale.format( date, {selector: 'date', datePattern:format });}
	    function strip_id(key, value)  { return key == '_id' ? undefined : value; }

	    var socket = io.connect('/');
	    socket.on('all', function (data) {
	    onefour = dom.byId('onefour');
	    onefour.innerHTML = '<pre> data: ' + JSON.stringify(data, strip_id, 2) + '</pre>'; 
	    });
	    });
