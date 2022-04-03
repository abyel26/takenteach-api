//Author: Abyel Romero


var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB, { useUnifiedTopology: true, useNewUrlParser: true} );
mongoose.set('useCreateIndex', true);


// User schema
var InstructorSchema = new Schema({
    firstName: String,
    lastName: String,
    email: { type: String, required: true, index: { unique: true }},
    username: { type: String, required: true, index: { unique: true }},
    password: { type: String, required: true, select: false },
    about: String,
    teachsubject: String,
    howlongteach: String,
    credentials: String,
    courses: [String]
});

// Hash the password before the user is saved
InstructorSchema.pre('save', function(next) {
    var user = this;

    // hash the password only if the password has been changed or user is new
    if (!user.isModified('password')) return next();

    // generate the hash
    bcrypt.hash(user.password, null, null, function(err, hash) {
        if (err) return next(err);

        // change the password to the hashed version
        user.password = hash;
        next();
    });
});
InstructorSchema.methods.compareHash = function(password, callback) {//Compare with hashed password
    var user = this;

    bcrypt.compare(password, user.password, function(err, equal) {//Decrypt hashed paswd and compare.
        callback(equal);
    });
};

// return the model to mongo
module.exports = mongoose.model('instructors', InstructorSchema);