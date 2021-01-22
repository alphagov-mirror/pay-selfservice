'use strict'

const { renderErrorView } = require('../../utils/response')
const paths = require('../../paths')
const formatAccountPathsFor = require('../../utils/format-account-paths-for')

module.exports = function checkVatNumberNotSubmitted (req, res, next) {
  if (!req.account) {
    renderErrorView(req, res)
    return
  }

  const stripeAccountSetup = req.account.connectorGatewayAccountStripeProgress
  if (!stripeAccountSetup) {
    renderErrorView(req, res, 'Please try again or contact support team')
  } else {
    if (stripeAccountSetup.vatNumber) {
      req.flash('genericError', 'You’ve already provided your VAT number. Contact GOV.UK Pay support if you need to update it.')
      res.redirect(303, formatAccountPathsFor(paths.account.dashboard.index, req.account.external_id))
    } else {
      next()
    }
  }
}
