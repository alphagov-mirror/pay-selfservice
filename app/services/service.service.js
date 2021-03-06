'use strict'

const lodash = require('lodash')
const { keys } = require('@govuk-pay/pay-js-commons').logging

const logger = require('../utils/logger')(__filename)
const getAdminUsersClient = require('./clients/adminusers.client')
const { ConnectorClient } = require('./clients/connector.client')
const directDebitConnectorClient = require('./clients/direct-debit-connector.client')
const { isADirectDebitAccount } = directDebitConnectorClient
const CardGatewayAccount = require('../models/GatewayAccount.class')
const Service = require('../models/Service.class')
const connectorClient = new ConnectorClient(process.env.CONNECTOR_URL)
const adminUsersClient = getAdminUsersClient()

async function getGatewayAccounts (gatewayAccountIds, correlationId) {
  const cardGatewayAccountIds = gatewayAccountIds.filter(id => !isADirectDebitAccount(id))

  const cardGatewayAccounts = await connectorClient.getAccounts({
    gatewayAccountIds: cardGatewayAccountIds,
    correlationId: correlationId
  })

  return cardGatewayAccounts.accounts
    .map(gatewayAccount => new CardGatewayAccount(gatewayAccount).toMinimalJson())
}

async function updateServiceName (serviceExternalId, serviceName, serviceNameCy, correlationId) {
  if (!serviceExternalId) {
    return Promise.reject(new Error(`argument: 'serviceExternalId' cannot be undefined`))
  }

  const result = await adminUsersClient.updateServiceName(serviceExternalId, serviceName, serviceNameCy, correlationId)

  const gatewayAccountIds = lodash.get(result, 'gateway_account_ids', [])

  await Promise.all(
    gatewayAccountIds.map(async gatewayAccountId => {
      if (gatewayAccountId && !isADirectDebitAccount(gatewayAccountId)) {
        const value = await connectorClient.patchServiceName(gatewayAccountId, serviceName, correlationId)
        return value
      }
    })
  )

  return new Service(result)
}

function updateService (serviceExternalId, serviceUpdateRequest, correlationId) {
  return adminUsersClient.updateService(serviceExternalId, serviceUpdateRequest, correlationId)
}

async function createService (serviceName, serviceNameCy, user, correlationId) {
  if (!serviceName) serviceName = 'System Generated'
  if (!serviceNameCy) serviceNameCy = ''

  const gatewayAccount = await connectorClient.createGatewayAccount('sandbox', 'test', serviceName, null, correlationId)
  const service = await adminUsersClient.createService(serviceName, serviceNameCy, [gatewayAccount.gateway_account_id], correlationId)

  const logContext = {
    internal_user: user.internalUser
  }
  logContext[keys.USER_EXTERNAL_ID] = user.externalId
  logContext[keys.SERVICE_EXTERNAL_ID] = service.externalId
  logContext[keys.GATEWAY_ACCOUNT_ID] = gatewayAccount.gateway_account_id
  logger.info('New service added by existing user', logContext)

  return service
}

function toggleCollectBillingAddress (serviceExternalId, collectBillingAddress, correlationId) {
  return adminUsersClient.updateCollectBillingAddress(serviceExternalId, collectBillingAddress, correlationId)
}

function updateCurrentGoLiveStage (serviceExternalId, newStage, correlationId) {
  return adminUsersClient.updateCurrentGoLiveStage(serviceExternalId, newStage, correlationId)
}

function addStripeAgreementIpAddress (serviceExternalId, ipAddress, correlationId) {
  return adminUsersClient.addStripeAgreementIpAddress(serviceExternalId, ipAddress, correlationId)
}

function addGovUkAgreementEmailAddress (serviceExternalId, userExternalId, correlationId) {
  return adminUsersClient.addGovUkAgreementEmailAddress(serviceExternalId, userExternalId, correlationId)
}

module.exports = {
  getGatewayAccounts,
  updateService,
  updateServiceName,
  createService,
  toggleCollectBillingAddress,
  updateCurrentGoLiveStage,
  addStripeAgreementIpAddress,
  addGovUkAgreementEmailAddress
}
