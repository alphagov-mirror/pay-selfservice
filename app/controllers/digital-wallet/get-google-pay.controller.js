'use strict'

// Local dependencies
const { response } = require('../../utils/response')

module.exports = (req, res) => {
  return response(req, res, 'digital-wallet/google-pay', {})
}
