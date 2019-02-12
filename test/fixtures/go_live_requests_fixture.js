'use strict'

const path = require('path')
const _ = require('lodash')

// Custom dependencies
const pactBase = require(path.join(__dirname, '/pact_base'))
const utils = require('../cypress/utils/request_to_go_live_utils')

// Global setup
const pactServices = pactBase({ array: ['service_ids'] })

module.exports = {
  validPostGovUkPayAgreementRequest: opts => {
    opts = opts || {}

    const data = {
      user_external_id: opts.user_external_id || utils.variables.userExternalId
    }

    return {
      getPactified: () => {
        return pactServices.pactify(data)
      },
      getPlain: () => {
        return _.clone(data)
      }
    }
  },

  validPostStripeAgreementRequest: opts => {
    opts = opts || {}

    const data = {
      ip_address: opts.ip_address || '93.184.216.34'
    }

    return {
      getPactified: () => {
        return pactServices.pactify(data)
      },
      getPlain: () => {
        return _.clone(data)
      }
    }
  }
}
