const EDIT_CREDENTIALS_MODE = 'editCredentials'
const EDIT_NOTIFICATION_CREDENTIALS_MODE = 'editNotificationCredentials'

const _ = require('lodash')
const paths = require('../paths')
const formatAccountPathsFor = require('../utils/format-account-paths-for')
const { response } = require('../utils/response')
const { renderErrorView } = require('../utils/response')
const { ConnectorClient } = require('../services/clients/connector.client')
const { CONNECTOR_URL } = process.env
const { CORRELATION_HEADER } = require('../utils/correlation-header')
const { isPasswordLessThanTenChars } = require('../browsered/field-validation-checks')

const connectorClient = new ConnectorClient(CONNECTOR_URL)

function showSuccessView (viewMode, req, res) {
  let responsePayload = {}

  responsePayload.editNotificationCredentialsMode = (viewMode === EDIT_NOTIFICATION_CREDENTIALS_MODE)

  const invalidCreds = _.get(req, 'session.pageData.editNotificationCredentials')
  if (invalidCreds) {
    responsePayload.lastNotificationsData = invalidCreds
    delete req.session.pageData.editNotificationCredentials
  }
  responsePayload.change = _.get(req, 'query.change', {})

  response(req, res, 'credentials/' + req.account.payment_provider, responsePayload)
}

function loadIndex (req, res, viewMode) {
  if (req.account) {
    if (req.account.payment_provider === 'stripe') {
      res.status(404)
      res.render('404')
    } else {
      showSuccessView(viewMode, req, res)
    }
  } else {
    renderErrorView(req, res)
  }
}

function credentialsPatchRequestValueOf (req) {
  let requestPayload = {
    credentials: {
      username: req.body.username && req.body.username.trim(),
      password: req.body.password && req.body.password.trim()
    }
  }

  const merchantId = _.get(req, 'body.merchantId')
  if (merchantId) {
    requestPayload.credentials.merchant_id = req.body.merchantId.trim()
  }

  const shaInPassphrase = _.get(req, 'body.shaInPassphrase')
  if (shaInPassphrase) {
    requestPayload.credentials.sha_in_passphrase = req.body.shaInPassphrase.trim()
  }

  const shaOutPassphrase = _.get(req, 'body.shaOutPassphrase')
  if (shaOutPassphrase) {
    requestPayload.credentials.sha_out_passphrase = req.body.shaOutPassphrase.trim()
  }

  return requestPayload
}

module.exports = {
  index: function (req, res) {
    loadIndex(req, res)
  },

  editCredentials: function (req, res) {
    loadIndex(req, res, EDIT_CREDENTIALS_MODE)
  },

  editNotificationCredentials: function (req, res) {
    loadIndex(req, res, EDIT_NOTIFICATION_CREDENTIALS_MODE)
  },

  updateNotificationCredentials: async function (req, res) {
    const accountId = req.account.gateway_account_id
    const username = req.body.username && req.body.username.trim()
    const password = req.body.password && req.body.password.trim()

    if (!username) {
      req.flash('genericError', 'Enter a username')
    } else if (!password) {
      req.flash('genericError', 'Enter a password')
    } else {
      const failedValidationMessage = isPasswordLessThanTenChars(password)
      if (failedValidationMessage) {
        req.flash('genericError', failedValidationMessage)
      }
    }

    if (_.get(req, 'session.flash.genericError.length')) {
      _.set(req, 'session.pageData.editNotificationCredentials', { username, password })
      return res.redirect(formatAccountPathsFor(paths.account.notificationCredentials.edit, req.account && req.account.external_id))
    }

    const correlationId = req.headers[CORRELATION_HEADER] || ''

    try {
      await connectorClient.postAccountNotificationCredentials({
        payload: { username, password },
        correlationId: correlationId,
        gatewayAccountId: accountId
      })

      return res.redirect(303, formatAccountPathsFor(paths.account.yourPsp.index, req.account && req.account.external_id))
    } catch (err) {
      return renderErrorView(req, res)
    }
  },

  update: async function (req, res) {
    const accountId = req.account.gateway_account_id
    const correlationId = req.headers[CORRELATION_HEADER] || ''

    try {
      await connectorClient.patchAccountCredentials({
        payload: credentialsPatchRequestValueOf(req), correlationId: correlationId, gatewayAccountId: accountId
      })

      return res.redirect(303, formatAccountPathsFor(paths.account.yourPsp.index, req.account && req.account.external_id))
    } catch (err) {
      return renderErrorView(req, res)
    }
  }
}
