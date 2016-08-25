exports = module.exports = function(io){
    
    var User = require('./models/user');

    io.sockets.on('connection', function (socket) {
        console.log('a user connectioned');
       
        //when the map page initializes, send over a list of user objects
        socket.on('mapInit', function(data) {
            User.find({}, function(err, users) {
                socket.emit('users', users);
            });
            
            var query = {username: data.username};
            User.findOne(query, function(err, user) {
                if (err) return handleError(err);
                socket.broadcast.emit('updateClient', user);               
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

        //this happens when a client kills someone
        socket.on('kill', function(data) {
            var conditions = { username: data.killed };
            var update = { $set: { killedBy: data.killedBy }};
            var options = { new : true };
            var cb = function(err, user){
                user.save(function(err) {
                    if (err) return handleError(err);
                    socket.broadcast.emit('death', user);
                });
            };
            User.findOneAndUpdate(conditions, update, options, cb);             
        });

        socket.on('disconnect', function(){
            console.log('user disconnectioned');
        });
    });
};
