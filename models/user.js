var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	username: String,
    coordList: {type: Array, default: [[44.7967, -68.7614],[44.7967, -68.7614]]},
	duration: {type: Number, default: 0},
    killedBy: {type: String, default:null},
    createdAt: Date,
	updatedAt: Date
});

//before saving, makes date current
userSchema.pre('save', function(next) {
	var currentDate = new Date();
	this.updatedAt = currentDate;

	if (!this.createdAt)
		this.createdAt = currentDate;

	next();
});

var User = mongoose.model('User', userSchema);

module.exports = User;


