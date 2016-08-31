var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	username: String,
    coordList: {type: Array, default: [[44.7967, -68.7614],[44.7967, -68.7614]]},
	duration: {type: Number, default: 0},
    inventory: {type: Schema.Types.Mixed, default: {}},
    stats: {
        range: {type: Number, default: 18}    
    },
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
        this.inventory.money = Math.floor((Math.random()*100)+1);
	next();
});

var User = mongoose.model('User', userSchema);

module.exports = User;


