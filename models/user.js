var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	username: String,
	xLoc: {type: Number, default: 44.8012},
	yLoc: {type: Number, default: -68.7778},
	xDest: {type: Number, default: 44.7967},
	yDest: {type: Number, default: -68.7614},
	createdAt: Date,
	updatedAt: Date
});

//before saving, makes date current
userSchema.pre('save', function(next) {
	var currentDate = new Date();
	this.updateAt = currentDate;

	if (!this.createdAt)
		this.createdAt = currentDate;

	next();
});

//Finds by username
userSchema.statics.findByUsername = function(usernamename, cb) {
	return this.find({ username: new RegExp(name, 'i') }, cb);
};


var User = mongoose.model('User', userSchema);

module.exports = User;


