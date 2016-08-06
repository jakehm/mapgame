var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();
var User = require('../models/user');


router.get('/', function (req, res) {
	res.render('index', { user : req.user });
});

router.get('/register', function(req, res) {
	res.render('register', { });
});

router.post('/register', function(req, res, next) {
	Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
		if (err) {
			return res.render('register', { error : err.message });
		}

		passport.authenticate('local')(req, res, function () {
			req.session.save(function (err) {
				if (err) {
					return next(err);
				}

				res.redirect('/');
			});
		});
	});
});


router.get('/login', function(req, res) {
	res.render('login', { user : req.user, error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res, next) {
	req.session.save(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

router.get('/logout', function(req, res, next) {
	req.logout();
	req.session.save(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

router.get('/ping', function(req, res){
	res.status(200).send("pong!");
});

router.get('/map', function(req, res) {
	var xDest;
	var yDest;
	var xLoc;
	var yLoc;
	var updatedAt;
	User.findOne({username : req.user.username}, function (err,user){
		if (err) return handleError(err);
		if (!user) {
			var newUser = User({ username : req.user.username});
			newUser.save(function(err) {
				if (err) throw err;
				console.log('User created.');
				xDest = newUser.xDest;
				yDest = newUser.yDest;
				xLoc = newUser.xLoc;
				yLoc = newUser.yLoc;
				updatedAt = newUser.updatedAt;
			});
		} else {
			xDest = user.xDest;
			yDest = user.yDest;
			xLoc = user.xLoc;
			yLoc = user.yLoc;
			updatedAt = user.updatedAt;
		}
		updatedAt = updatedAt.getTime() / 1000;
		console.log(updatedAt);
		//now render the page with necessary params
		res.render('map', {
			user : req.user.username,
			xDest : xDest,
			yDest : yDest,
			xLoc : xLoc,
			yLoc : yLoc,
			updatedAt : updatedAt
		});
	});
});

router.post('/map', function(req, res) {

	var newLoc = req.body.hiddenLoc;
	var xLoc = newLoc.split(',')[0];
	var yLoc = newLoc.split(',')[1];

	var newDest = req.body.hiddenDest;
	var xDest = newDest.split(',')[0];
	var yDest = newDest.split(',')[1];


	User.findOne({username : req.user.username}, function (err,user){	
		if (err) return handleError(err);
		user.xLoc = xLoc;
		user.yLoc = yLoc;
		user.xDest = xDest;
		user.yDest = yDest;
		user.save(function (err) {
			if (err) return handleError(err);
		});
		console.log(user.updatedAt);
	});
});


module.exports = router;

