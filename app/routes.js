// app/routes.js
module.exports = function(app, actions) {

	// =====================================
	// main page ===========================
	// =====================================
	app.get('/', function (req, res) {
		  res.render('index.ejs', {tracker: global.env.tracker});
		});
	
	// =====================================
	// post new tracking string ============
	// =====================================
	app.post('/', function (req, res) {
		var curDate = new Date();
		var diff = Math.ceil((curDate - global.env.lastInit)/1000);
		if(diff >= 30)
			{
			//console.log(diff);
			  actions.initialize(req.body.tracker);
			  res.end(global.env.tracker);
			  global.env.lastInit = curDate;
			}
		else
			{
			//console.log("in else");
			res.end((30-diff).toString());
			}
		});	
}
