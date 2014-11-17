var count = 0;
var yaxisoffset = 40;
var languageGranularity = 'seconds';
var granularity = 'seconds';
var resizeCount = 0;
var sourceVolumeData = [{"source": "<temp>loading", "count": 1}];
var languageData = [{"granularity": "seconds", "lang":"en","count":1},
      	          {"granularity": "seconds", "lang":"in","count":3},
      	          {"granularity": "seconds", "lang":"jp","count":7},
      	          {"granularity": "seconds", "lang":"cn","count":4},
      	          {"granularity": "seconds", "lang":"fr","count":2},
      	          {"granularity": "minutes", "lang":"en","count":27},
      	          {"granularity": "minutes", "lang":"in","count":21},
      	          {"granularity": "minutes", "lang":"jp","count":45},
      	          {"granularity": "minutes", "lang":"cn","count":61},
      	          {"granularity": "minutes", "lang":"fr","count":22},
      	          {"granularity": "hours", "lang":"en","count":540},
      	          {"granularity": "hours", "lang":"in","count":258},
      	          {"granularity": "hours", "lang":"jp","count":612},
      	          {"granularity": "hours", "lang":"cn","count":300},
      	          {"granularity": "hours", "lang":"fr","count":120}];

$(document).ready(function(){
	
	var socket = io.connect('/');
	pingServer(socket); //initial ping - heroku will close connection if no ping within 30s of connection
	function strip_id(key, value)  { return key == '_id' ? undefined : value; }

		
	socket.on('all', function (data) {
		document.getElementById('console').innerHTML = 'feed: ' + JSON.stringify(data, strip_id, 2); 
	});
	socket.on('volume', function (data) {
		document.getElementById('console2').innerHTML = 'total volume: ' + JSON.stringify(data[0], strip_id, 2);
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
	
	
	// source volume
	
	// bar graph
	//$(document).ready(function(){

	function renderChart() {
		$('#source-graph svg').remove();
		var data = sourceVolumeData;
		var valueLabelWidth = 40; // space reserved for value labels (right)
		var barHeight = 20; // height of one bar
		var barLabelWidth = 100; // space reserved for bar labels
		var barLabelPadding = 5; // padding between bar and bar labels (left)
		var gridLabelHeight = 18; // space reserved for gridline labels
		var gridChartOffset = 3; // space between start of grid and first bar
		var maxBarWidth = 420; // width of the bar with the max value
		 
		// accessor functions 
		var barLabel = function(d) { return d['source']; };
		var barValue = function(d) { return parseFloat(d['count']); };
		 
		// sorting
		var sortedData = data.sort(function(a, b) {
		 return d3.descending(barValue(a), barValue(b));
		}); 

		// scales
		var yScale = d3.scale.ordinal().domain(d3.range(0, sortedData.length)).rangeBands([0, sortedData.length * barHeight]);
		var y = function(d, i) { return yScale(i); };
		var yText = function(d, i) { return y(d, i) + yScale.rangeBand() / 2; };
		var x = d3.scale.linear().domain([0, d3.max(sortedData, barValue)]).range([0, maxBarWidth]);
		// svg container element
		var chart = d3.select('#source-graph').append("svg")
		  .attr('width', maxBarWidth + barLabelWidth + valueLabelWidth)
		  .attr('height', gridLabelHeight + gridChartOffset + sortedData.length * barHeight);
		// grid line labels
		var gridContainer = chart.append('g')
		  .attr('transform', 'translate(' + barLabelWidth + ',' + gridLabelHeight + ')'); 
		gridContainer.selectAll("text").data(x.ticks(10)).enter().append("text")
		  .attr("x", x)
		  .attr("dy", -3)
		  .attr("text-anchor", "middle")
		  .attr('fill', 'white')
		  .text(String);
		// vertical grid lines
		gridContainer.selectAll("line").data(x.ticks(10)).enter().append("line")
		  .attr("x1", x)
		  .attr("x2", x)
		  .attr("y1", 0)
		  .attr("y2", yScale.rangeExtent()[1] + gridChartOffset)
		  .style("stroke", "#ccc");
		// bar labels
		var labelsContainer = chart.append('g')
		  .attr('transform', 'translate(' + (barLabelWidth - barLabelPadding) + ',' + (gridLabelHeight + gridChartOffset) + ')'); 
		labelsContainer.selectAll('text').data(sortedData).enter().append('text')
		  .attr('y', yText)
		  .attr('stroke', 'none')
		  .attr('fill', 'white')
		  .attr("dy", ".35em") // vertical-align: middle
		  .attr('text-anchor', 'end')
		  .text(barLabel);
		// bars
		var barsContainer = chart.append('g')
		  .attr('transform', 'translate(' + barLabelWidth + ',' + (gridLabelHeight + gridChartOffset) + ')'); 
		barsContainer.selectAll("rect").data(sortedData).enter().append("rect")
		  .attr('y', y)
		  .attr('height', yScale.rangeBand())
		  .attr('width', function(d) { return x(barValue(d)); })
		  .attr('stroke', '#1b1b24')
		  .attr('fill', 'steelblue');
		// bar value labels
		barsContainer.selectAll("text").data(sortedData).enter().append("text")
		  .attr("x", function(d) { return x(barValue(d)); })
		  .attr("y", yText)
		  .attr("dx", 3) // padding-left
		  .attr("dy", ".35em") // vertical-align: middle
		  .attr("text-anchor", "start") // text-align: right
		  .attr("fill", "white")
		  .attr("stroke", "none")
		  .text(function(d) { return d3.round(barValue(d), 2); });
		// start line
		barsContainer.append("line")
		  .attr("y1", -gridChartOffset)
		  .attr("y2", yScale.rangeExtent()[1] + gridChartOffset)
		  .style("stroke", "#000");

		}
		renderChart();
		
	//});
	
	socket.on('sourceVolume', function (data) {
		console.log(data);
		sourceVolumeData = data;
		document.getElementById('console3').innerHTML = 'volume by source: ' + JSON.stringify(data, strip_id, 2);
		renderChart();
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
	
	//var sidebarWidth = $('#sidebar-container').is(":visible") ? 260 : 0;
var margin = {top: 6, right: 0, bottom: 20, left: 0},
    width = $('#main-content-container').width() /*- sidebarWidth*/ - margin.right,
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

function setVolumeGranularity(elm) {
	var elmGranularity = $(elm).data("granularity");
	if(granularity != elmGranularity)
		{
		granularity = elmGranularity;
		$('#volume-granularity-dropdown').html(elm.innerHTML + ' <span class="caret"></span>');
		renderVolumeGraph();
		}
	
}

function setLanguageGranularity(elm) {
	var elmGranularity = $(elm).data("granularity");
	if(languageGranularity != elmGranularity)
		{
		languageGranularity = elmGranularity;
		$('#language-granularity-dropdown').html(elm.innerHTML + ' <span class="caret"></span>');
		$("#languageGraph:checkbox[value=" + languageGranularity + "]").prop("checked","true");
		}
	
}

$(document).ready(function(){
	
	var width = 250,
    height = 250,
    radius = Math.min(width, height) / 2;

var color = d3.scale.category20();

var pie = d3.layout.pie()
    .value(function(d) { return d.count; })
    .sort(null);

var arc = d3.svg.arc()
    .innerRadius(radius - 50)
    .outerRadius(radius - 20);

var svg = d3.select("#languageGraph").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var path = svg.selectAll("path");

  var languagesByGranularity = d3.nest()
      .key(function(d) { return d.granularity; })
      .entries(languageData)
      .reverse();

 var li = d3.select("#language-dropdown").selectAll("li");
      li.data(languagesByGranularity)
    .enter().append("li").on("click", change);

 d3.select("#language-dropdown").selectAll("li").on("click", change);

 change(li.data()[0]);
 
  function change(lang) {
    var data0 = path.data(),
        data1 = pie(lang.values);

    path = path.data(data1, key);

    path.enter().append("path")
        .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
        .attr("fill", function(d) { return color(d.data.lang); })
      .append("title")
        .text(function(d) { return d.data.lang; });

    path.exit()
        .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
      .transition()
        .duration(750)
        .attrTween("d", arcTween)
        .remove();

    path.transition()
        .duration(750)
        .attrTween("d", arcTween);
  }
//});

function key(d) {
  return d.data.lang;
}

function type(d) {
  d.count = +d.count;
  return d;
}

function findNeighborArc(i, data0, data1, key) {
  var d;
  return (d = findPreceding(i, data0, data1, key)) ? {startAngle: d.endAngle, endAngle: d.endAngle}
      : (d = findFollowing(i, data0, data1, key)) ? {startAngle: d.startAngle, endAngle: d.startAngle}
      : null;
}

// Find the element in data0 that joins the highest preceding element in data1.
function findPreceding(i, data0, data1, key) {
  var m = data0.length;
  while (--i >= 0) {
    var k = key(data1[i]);
    for (var j = 0; j < m; ++j) {
      if (key(data0[j]) === k) return data0[j];
    }
  }
}

// Find the element in data0 that joins the lowest following element in data1.
function findFollowing(i, data0, data1, key) {
  var n = data1.length, m = data0.length;
  while (++i < n) {
    var k = key(data1[i]);
    for (var j = 0; j < m; ++j) {
      if (key(data0[j]) === k) return data0[j];
    }
  }
}

function arcTween(d) {
  var i = d3.interpolate(this._current, d);
  this._current = i(0);
  return function(t) { return arc(i(t)); };
}
});