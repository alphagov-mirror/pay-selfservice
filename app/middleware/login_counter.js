"use strict";
var errorView = require('../utils/response.js').renderErrorView;
var User      = require('../models/user.js');
var paths     = require('../paths.js');
var logger    = require('winston');


var lockOut = (req,res, user) => {
  user.toggleDisabled(true).then(()=>{
    logger.error("locked out user id:" + user.id + " due to many password attempts");
    res.render("login/noaccess");
  })
}


module.exports = {
  enforce: function (req, res, next) {
   var email = req.body.email || req.user.email;
    User.find(email).then((user)=> {
      var attempts = user.login_counter,
      overLimit    = attempts > parseInt(process.env.LOGIN_ATTEMPT_CAP); 
      if (overLimit) return lockOut(req, res, user);
      user.incrementLoginCount().then(
        ()=> next(),
        ()=> { throw new Error("couldn't save user login counter");}
      )
    },next)
  },
  
  reset: function(req, res, next) {
    req.session.loginAttempts == undefined;
  }
}