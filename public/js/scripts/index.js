var count = 0;
var yaxisoffset = 40;
var granularity = 'seconds';
var resizeCount = 0;

$(document).ready(function(){
	
	var socket = io.connect('/');
	pingServer(socket); //initial ping - heroku will close connection if no ping within 30s of connection
	function strip_id(key, value)  { return key == '_id' ? undefined : value; }

		
	socket.on('all', function (data) {
		document.getElementById('console').innerHTML = 'feed: ' + JSON.stringify(data, strip_id, 2); 
	});
	socket.on('volume', function (data) {
		document.getElementById('console2').innerHTML = 'volume: ' + JSON.stringify(data[0], strip_id, 2);
		if(granularity == 'hours')
			{
			count = data[0].hourVolume;
			}
		else if(granularity == 'minutes')
			{
			count = data[0].minutes.minuteVolume;
			}
		else
			{
			count = data[0].minutes.seconds.secondVolume;
			}
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
	
	renderVolumeGraph();
});

function renderVolumeGraph() {
	
	//temporary bandaid to re-render graph on resize
	$('#volumeGraph').remove();
	
	var n = 100,
    duration = 750,
    now = new Date(Date.now() - duration),
    data = d3.range(n).map(function() { return 0; });
	now.setSeconds(now.getSeconds() - 5);
	
	var sidebarWidth = $('#sidebar-container').is(":visible") ? 260 : 0;
var margin = {top: 6, right: 0, bottom: 20, left: 0},
    width = $(document).width() - sidebarWidth - margin.right,
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

var svg = d3.select("#volume-graph-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    /*.attr("viewBox", "0 0 836 100")*/
    .attr("id", "volumeGraph")
  .append("g")
    .attr("transform", "translate(" + yaxisoffset + "," + margin.top + ")");

svg.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", width)
    .attr("height", height);

var xaxis = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

// currently using .y.axis g:first-child workaround in index.css to hide first tick
var yaxis = svg.append("g")
	.attr("class", "y axis")
	/*.attr("transform", "translate(" + yaxisoffset + ",0)")*/
	.call(y.axis = d3.svg.axis().scale(y).ticks(5).orient("left"));

var path = svg.append("g")
    .attr("clip-path", "url(#clip)")
  .append("path")
    .data([data])
    .attr("class", "line");

tick(resizeCount);

function tick(resizeIndex) {
	
	// preventing residual recursions
	if (resizeIndex < resizeCount)
		{
		return;
		}
		var i = resizeIndex;
		console.log("in");
	  // update the domains
	  now = new Date();
	  now.setSeconds(now.getSeconds() - 5);
	  x.domain([now - (n - 2) * duration, now - duration]);
	  y.domain([0, d3.max(data)]);

	  // push the accumulated count onto the back, and reset the count
	  data.push(count);
	  //count = 0;

	  // redraw the line
	  svg.select(".line")
	      .attr("d", line)
	      .attr("transform", null);

	  // slide the x-axis left
	  xaxis.transition()
	      .duration(duration)
	      .ease("linear")
	      .call(x.axis);
	  
	  
	  // update the y-axis
	  yaxis.transition()
      .duration(duration)
      .ease("linear")
      .call(y.axis);

	  // slide the line left
	  path.transition()
	      .duration(duration)
	      .ease("linear")
	      .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")")
	      .each("end", function(){tick(i);});

	  // pop the old data point off the front
	  data.shift();

	}

}


//temp
$(window).resize(function(){
	resizeCount++;
	renderVolumeGraph();
});

function setGranularity(elm) {
	var elmGranularity = $(elm).data("granularity");
	if(granularity != elmGranularity)
		{
		granularity = elmGranularity;
		$('#granularity-dropdown').html(elm.innerHTML + '<span class="caret"></span>');
		renderVolumeGraph();
		}
	
}