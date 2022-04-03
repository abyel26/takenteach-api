//Author: Abyel Romero


var passport = require('passport');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var User = require('./Users');

var opts = {};//Passport options
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
opts.secretOrKey = process.env.SECRET_KEY;

passport.use(new JwtStrategy(opts, function(jwt_payload, done) {//Set passport with JWT auth

    //Check a user exists in database from jwt token.
    User.findById(jwt_payload.id, function (err, user) {
        if (user) {
            done(null, user);//If user exists return the user.
        } else {
            done(null, false);
        }
    });
}));

//Export function so we can use them in Server.js
exports.isAuthenticated = passport.authenticate('jwt', { session : false });
exports.secret = opts.secretOrKey ;