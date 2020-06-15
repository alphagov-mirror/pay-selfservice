'use strict'

const chai = require('chai')

const PactInteractionBuilder = require('../../../fixtures/pact_interaction_builder').PactInteractionBuilder
const payoutFixture = require('../../../fixtures/payout_fixtures')
const ledgerClient = require('../../../../app/services/clients/ledger_client')

const pactTestProvider = require('./ledger_pact_test_provider')

const { expect } = chai

const GATEWAY_ACCOUNT_ID = '654321'

describe('ledger client', () => {
  before(() => pactTestProvider.setup())
  after(() => pactTestProvider.finalize())

  describe('search payouts', () => {
    const payoutOpts = [{
      gatewayAccountId: GATEWAY_ACCOUNT_ID,
      gatewayPayoutId: 'payout-id-2',
      createdDate: '2020-05-22T12:22:16.067Z',
      paidoutDate: '2020-05-23T14:22:16.067Z',
      amount: 2345
    }, {
      gatewayAccountId: GATEWAY_ACCOUNT_ID,
      gatewayPayoutId: 'payout-id-1',
      createdDate: '2020-05-21T12:22:16.067Z',
      paidoutDate: '2020-05-22T14:22:16.067Z',
      amount: 1250
    }]
    const response = payoutFixture.validPayoutSearchResponse(payoutOpts)

    before(() => {
      return pactTestProvider.addInteraction(
        new PactInteractionBuilder('/v1/payout')
          .withQuery('gateway_account_id', GATEWAY_ACCOUNT_ID)
          .withQuery('state', 'paidout')
          .withQuery('page', '1')
          .withUponReceiving('a valid search payout details request')
          .withState('two payouts exist for selfservice search')
          .withMethod('GET')
          .withStatusCode(200)
          .withResponseBody(response.getPactified())
          .build()
      )
    })
    afterEach(() => pactTestProvider.verify())

    it('should search payouts successfully', async () => {
      const ledgerResult = await ledgerClient.payouts([ GATEWAY_ACCOUNT_ID ], 1)
      expect(ledgerResult).to.deep.equal(response.getPlain())
    })
  })
})
