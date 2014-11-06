// app/routes.js
module.exports = function(app) {

	// =====================================
	// main page ===========================
	// =====================================
	app.get('/', function (req, res) {
		  res.render('/index.ejs');
		});
	
}