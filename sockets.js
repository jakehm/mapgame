exports = module.exports = function(io){
    
    var User = require('./models/user');

   //Delete the comment below
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
       
        //when the map page initializes, send over a list of user objects
        socket.on('mapInit', function() {
            User.find({}, function(err, users) {
                socket.emit('users', users);
            });        
        });

        //when a user picks a new route, update the database and broadcast
        socket.on('updateServer', function(data) {
            var query = {username: data.username};
            var update = {$set:{
                duration: data.totalDuration,
                coordList: data.coordList
            }};
            User.findOneAndUpdate(query, update, {new:true}, function(err, user) {
                user.save(function(err) {
                    if (err) return handleError(err);
                    socket.broadcast.emit('updateClient', user);               
                });
            });
        });


        socket.on('disconnect', function(){
            console.log('user disconnectioned');
        });

    });
};
