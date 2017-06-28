var logger = require('winston');
var _ = require('lodash');
var response = require('../utils/response.js').response;
var userService = require('../services/user_service.js');
var {setSessionVersion} = require('../services/auth_service.js');
var router = require('../routes.js');
var passport = require('passport');
var paths = require('../paths.js');
var errorView = require('../utils/response.js').renderErrorView;
var CORRELATION_HEADER = require('../utils/correlation_header.js').CORRELATION_HEADER;
let csrf = require('csrf');

var error = function (req, res, err) {
  errorView(req, res);
  logger.error(err);
};

var logLoginAction = function (req, message) {
  var correlationId = _.get(req, 'headers.' + CORRELATION_HEADER, '');
  logger.info(`[${correlationId}] ${message}`);
};

module.exports.loggedIn = function (req, res) {
  logLoginAction(req, 'successfully logged in');
  response(req, res, 'login/logged_in', {
    name: req.user.username
  });
};

module.exports.logOut = function (req, res) {

  if (req.user) {
    userService.logOut(req.user, req.correlationId);
  }

  if (req.session) {
    logLoginAction(req, 'logged out');
    req.session.destroy();
  }

  res.redirect(router.paths.user.logIn);
};


module.exports.noAccess = function (req, res) {
  res.render('login/noaccess');
};

module.exports.logInGet = function (req, res) {
  var setError = function (error_messages) {
        res.locals.flash.error = {'messages': error_messages};
      },
      error, error_messages;

  if (res.locals.flash.hasOwnProperty('error')) {
    error = res.locals.flash.error[0];

    switch (error) {
      case 'empty_username': setError({username: 'You must enter a username'}); break;
      case 'empty_password': setError({password: 'You must enter a username'}); break;
      case 'empty_all': setError({username: 'You must enter a username', password: 'You must enter a password'}); break;
      case 'invalid': setError({username: 'You must enter a valid username', password: 'You must enter a valid password'}); break;
    }
  }
  res.render('login/login');
};

/**
 * Reset the login counter for the user, and clean
 * session
 *
 * @param req
 * @param res
 */
module.exports.postLogin = function (req, res) {
  req.session = _.pick(req.session, ['passport', 'last_url', 'currentGatewayAccountId']);
  logLoginAction(req, 'successfully attempted username/password combination');
  res.redirect(paths.user.otpLogIn);
};

module.exports.logUserin = function (req, res, next) {
  var error = '';

  // username gets trimmed in middleware
  if (!req.body.username) {
    error = 'empty_username';
  }

  if (!req.body.password.trim()) {
    error = (error === 'empty_username') ? 'empty_all' : 'empty_password';
  }

  if (error !== '') {
    req.flash('error', error);
    res.redirect('/login');
  } else {
    return passport.authenticate('local', {
      failureRedirect: '/login',
      failureFlash: 'invalid'
    })(req, res, next);
  }
};

module.exports.logUserinOTP = function (req, res, next) {
  return passport.authenticate('local2Fa', {
    failureRedirect: '/otp-login',
    badRequestMessage: 'Invalid verification code.',
    failureFlash: true
  })(req, res, next);
};

module.exports.otpLogIn = function (req, res) {
  if (!req.session.sentCode) {
    var correlationId = req.headers[CORRELATION_HEADER] || '';
    userService.sendOTP(req.user, correlationId).then(function () {
        req.session.sentCode = true;
        res.render('login/otp-login');
      }, function (err) {
        error(req, res, err);
      }
    );
  } else {
    res.render('login/otp-login');
  }
};

module.exports.afterOTPLogin = function (req, res) {
  req.session.secondFactor = 'totp';
  const redirect_url = req.session.last_url || "/";
  delete req.session.last_url;
  logLoginAction(req, 'successfully entered a valid 2fa token');
  setSessionVersion(req);
  res.redirect(redirect_url);
};

module.exports.sendAgainGet = function (req, res) {
  res.render('login/send_otp_again');
};

module.exports.sendAgainPost = function (req, res) {
  var correlationId = req.headers[CORRELATION_HEADER] || '';
  userService.sendOTP(req.user, correlationId).then(
    () => {
      res.redirect(paths.user.otpLogIn);
    },
    (err) => {
      error(req, res, err);
    }
  );
};

module.exports.setupDirectLoginAfterRegister = function (req, res, user) {

  if (!user) {
    let correlationId = req.correlationId;
    logger.error(`[requestId=${correlationId}] unable to log user in directly after registration. missing user in req`);
    res.redirect(303, '/login');
    return;
  }
  req.register_invite.userExternalId = user.externalId;
};

module.exports.loginAfterRegister = function (req, res, next) {
  return passport.authenticate('localDirect', {failureRedirect: '/login'})(req, res, next);
};
