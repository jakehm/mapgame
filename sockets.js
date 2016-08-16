exports = module.exports = function(io){
    
    var User = require('./models/user');

   /* 
	User.findOne({username : req.user.username}, function (err,user){
		if (err) return handleError(err);
		if (!user) {
			var newUser = User({ username : req.user.username});
			newUser.save(function(err) {
				if (err) throw err;
				xDest = newUser.xDest;
				yDest = newUser.yDest;
				xLoc = newUser.xLoc;
				yLoc = newUser.yLoc;
				updatedAt = newUser.updatedAt.getTime()/1000;
				renderMap();
			});
		} else {
			xDest = user.xDest;
			yDest = user.yDest;
			xLoc = user.xLoc;
			yLoc = user.yLoc;
			updatedAt = user.updatedAt.getTime()/1000;
			renderMap();
		}
	});
    */
    io.sockets.on('connection', function (socket) {
        console.log('a user connectioned');
        
        socket.on('mapInit', function() {
            User.find({}, function(err, users) {
                socket.emit('users', users);
            });        
        });



        socket.on('disconnect', function(){
            console.log('user disconnectioned');
        });

    });
};
