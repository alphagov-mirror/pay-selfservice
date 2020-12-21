'use strict'

const pactBase = require('../../fixtures/pact-base')

const userReponsePactifier = pactBase({
  array: ['service_roles', '_links'],
  length: [{ key: 'permissions', length: 1 }]
})

module.exports = {
  userReponsePactifier
}