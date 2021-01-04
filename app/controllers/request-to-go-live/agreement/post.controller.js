'use strict'

const lodash = require('lodash')

const logger = require('../../../utils/logger')(__filename)
const { requestToGoLive } = require('../../../paths')
const goLiveStage = require('../../../models/go-live-stage')
const { updateCurrentGoLiveStage } = require('../../../services/service.service')
const { addGovUkAgreementEmailAddress, addStripeAgreementIpAddress } = require('../../../services/service.service')
const goLiveStageToNextPagePath = require('../go-live-stage-to-next-page-path')
const { renderErrorView } = require('../../../utils/response.js')
const { isIPv4, isIPv6 } = require('net')
const zendeskClient = require('../../../services/clients/zendesk.client')

const NOT_SELECTED_AGREEMENT_ERROR_MSG = 'You need to accept our legal terms to continue'
const stages = {
  CHOSEN_PSP_STRIPE: goLiveStage.TERMS_AGREED_STRIPE,
  CHOSEN_PSP_WORLDPAY: goLiveStage.TERMS_AGREED_WORLDPAY,
  CHOSEN_PSP_SMARTPAY: goLiveStage.TERMS_AGREED_SMARTPAY,
  CHOSEN_PSP_EPDQ: goLiveStage.TERMS_AGREED_EPDQ,
  CHOSEN_PSP_GOV_BANKING_WORLDPAY: goLiveStage.TERMS_AGREED_GOV_BANKING_WORLDPAY
}

const getUserIpAddress = req => {
  const xHeaderIpAddress = (req.headers['x-forwarded-for'])
  let ipAddress
  if (xHeaderIpAddress !== undefined) {
    ipAddress = xHeaderIpAddress.split(',')[0]
  } else {
    ipAddress = (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      (req.connection.socket && req.connection.socket.remoteAddress)
  }
  return ipAddress.toString().trim()
}

async function postUserIpAddress (req) {
  if (req.service.currentGoLiveStage === 'CHOSEN_PSP_STRIPE') {
    const ipAddress = getUserIpAddress(req)
    if (!isIPv4(ipAddress) && !isIPv6(ipAddress)) {
      logger.error(`request ${req.correlationId} has an invalid ip address: ` + ipAddress)
      throw new Error('Please try again or contact support team.')
    }
    await addStripeAgreementIpAddress(req.service.externalId, ipAddress, req.correlationId)
    return ipAddress
  }
}

const createZendeskMessage = opts => ` Service name: ${opts.serviceName}
 Organisation name: ${opts.merchantDetails}
 Service ID: ${opts.serviceExternalId}
 PSP: ${opts.psp}
 IP address: ${opts.ipAddress}
 Email address: ${opts.email}
 Time: ${opts.timestamp}
 Service created at: ${opts.serviceCreated}
`

module.exports = async (req, res, next) => {
  let agreement = lodash.get(req, 'body.agreement')
  if (agreement !== undefined) {
    try {
      const ipAddress = await postUserIpAddress(req)
      agreement = await addGovUkAgreementEmailAddress(req.service.externalId, req.user.externalId, req.correlationId)

      const messageOpts = {
        serviceName: req.service.name,
        merchantDetails: req.service.merchantDetails.name,
        serviceExternalId: req.service.externalId,
        psp: req.service.currentGoLiveStage,
        ipAddress: ipAddress || '',
        email: agreement.email,
        timestamp: agreement.agreement_time,
        serviceCreated: req.service.createdDate || '(service was created before we captured this date)'
      }
      const zendeskOpts = {
        correlationId: req.correlationId,
        email: agreement.email,
        name: req.user.username,
        type: 'task',
        subject: `Service (${req.service.name}) has finished go live request`,
        tags: ['govuk_pay_support'],
        message: createZendeskMessage(messageOpts)
      }
      await zendeskClient.createTicket(zendeskOpts)
      const updatedService = await updateCurrentGoLiveStage(req.service.externalId, stages[req.service.currentGoLiveStage], req.correlationId)

      return res.redirect(303,
        goLiveStageToNextPagePath[updatedService.currentGoLiveStage].replace(':externalServiceId', req.service.externalId)
      )
    } catch (err) {
      return next(err)
    }
  } else {
    req.flash('genericError', NOT_SELECTED_AGREEMENT_ERROR_MSG)
    lodash.set(req, 'session.pageData.requestToGoLive.agreement', {
      displayStripeAgreement: (lodash.get(req, 'service.currentGoLiveStage', '') === goLiveStage.CHOSEN_PSP_STRIPE)
    })
    return res.redirect(303,
      requestToGoLive.agreement.replace(':externalServiceId', req.service.externalId)
    )
  }
}
