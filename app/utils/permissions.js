'use strict'
const _ = require('lodash')
const { ConnectorClient } = require('../services/clients/connector_client.js')
const { isADirectDebitAccount } = require('./../services/clients/direct_debit_connector_client')
const client = new ConnectorClient(process.env.CONNECTOR_URL)

const userServicesContainsGatewayAccount = function userServicesContainsGatewayAccount (accountId, user) {
  const gatewayAccountIds = _.flattenDeep(_.concat(user.serviceRoles.map(serviceRole => serviceRole.service.gatewayAccountIds)))
  return accountId && gatewayAccountIds.indexOf(accountId) !== -1
}

const liveUserServicesGatewayAccounts = async function liveUserServicesGatewayAccounts (user, permissionName) {
  const accounts = await getAccounts(user, permissionName)

  return {
    headers: accountDetailHeaders(accounts),
    accounts: accountsString(accounts)
  }
}

const getAccounts = function getAccounts (user, permissionName) {
  const gatewayAccountIds = user.serviceRoles
    .filter((serviceRole) => serviceRole.role.permissions
      .map((permission) => permission.name)
      .includes(permissionName)
    )
    .flatMap(servicesRole => servicesRole.service.gatewayAccountIds)
    .reduce((accumulator, currentValue) => accumulator.concat(currentValue), [])
    .filter(gatewayAccountId => !isADirectDebitAccount(gatewayAccountId))

  return gatewayAccountIds.length
    ? client.getAccounts({ gatewayAccountIds }).then((result) => result.accounts)
    : Promise.resolve([])
}

const accountDetailHeaders = function accountDetailHeaders (accounts) {
  const shouldGetStripeHeaders = accounts
    .some((account) => account.payment_provider === 'stripe')

  const shouldGetMotoHeaders = accounts
    .some((account) => account.allow_moto)

  return {
    shouldGetMotoHeaders, shouldGetStripeHeaders
  }
}

const accountsString = function accountsString (accounts) {
  const emptyAccountsString = '[]'
  const outputString = accounts
    .filter((account) => account.type === 'live')
    .map((account) => account.gateway_account_id)
    .join(',')
  return outputString || emptyAccountsString
}

module.exports = {
  userServicesContainsGatewayAccount,
  liveUserServicesGatewayAccounts
}
