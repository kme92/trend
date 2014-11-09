$(document).ready(function(){

	(function() {
	
	var n = 100,
    duration = 750,
    now = new Date(Date.now() - duration),
    count = 0,
    data = d3.range(n).map(function() { return 0; });

var margin = {top: 6, right: 0, bottom: 20, left: 0},
    width = $(document).width() - margin.right,
    height = 100 - margin.top - margin.bottom;

var x = d3.time.scale()
    .domain([now - (n - 2) * duration, now - duration])
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d, i) { return x(now - (n - 1 - i) * duration); })
    .y(function(d, i) { return y(d); });

var svg = d3.select("body").append("p").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("id", "volumeGraph")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", width)
    .attr("height", height);

var axis = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

var path = svg.append("g")
    .attr("clip-path", "url(#clip)")
  .append("path")
    .data([data])
    .attr("class", "line");

tick();

d3.select(window)
    .on("scroll", function() { ++count; });

function tick() {

  // update the domains
  now = new Date();
  x.domain([now - (n - 2) * duration, now - duration]);
  y.domain([0, d3.max(data)]);

  // push the accumulated count onto the back, and reset the count
  data.push(count);
  count = 0;

  // redraw the line
  svg.select(".line")
      .attr("d", line)
      .attr("transform", null);

  // slide the x-axis left
  axis.transition()
      .duration(duration)
      .ease("linear")
      .call(x.axis);

  // slide the line left
  path.transition()
      .duration(duration)
      .ease("linear")
      .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")")
      .each("end", tick);

  // pop the old data point off the front
  data.shift();

}

})();
	
	/*function updateWindow(){
		w = window,
	    d = document,
	    e = d.documentElement,
	    g = d.getElementsByTagName('body')[0],
	    x = w.innerWidth || e.clientWidth || g.clientWidth;
	    y = w.innerHeight|| e.clientHeight|| g.clientHeight;

	    $('.svg').attr("width", x).attr("height", y);
	}
	window.onresize = updateWindow;*/
	
	var socket = io.connect('/');
	pingServer(socket); //initial ping - heroku will close connection if no ping within 30s of connection
	function strip_id(key, value)  { return key == '_id' ? undefined : value; }

		
	socket.on('all', function (data) {
		document.getElementById('console').innerHTML = 'data: ' + JSON.stringify(data, strip_id, 2); 
	});


	function pingServer(socket)
		{
		//console.log('pinging server at: ' + new Date());
		socket.emit('ping');
		}


	// ping server every 30s (heroku timeout is 55s)
	setInterval(function ()
		{
		pingServer(socket);
		}, 30000);
	
});