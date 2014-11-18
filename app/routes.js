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
		  actions.initialize(req.body.tracker);
		  res.end(global.env.tracker);
		});	
}
