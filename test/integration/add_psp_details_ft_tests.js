'use strict'

const supertest = require('supertest')
const nock = require('nock')
const cheerio = require('cheerio')
require('../test_helpers/serialize_mock.js')
const userCreator = require('../test_helpers/user_creator.js')
const getApp = require('../../server.js').getApp
const session = require('../test_helpers/mock_session.js')
const paths = require('../../app/paths')

const connectorMock = nock(process.env.CONNECTOR_URL)

const { validGatewayAccountResponse } = require('../fixtures/gateway_account_fixtures')
const { buildGetStripeAccountSetupResponse } = require('../fixtures/stripe_account_setup_fixtures')
const { expect } = require('chai')

const GATEWAY_ACCOUNT_ID = 111
const user = session.getUser({ gateway_account_ids: [GATEWAY_ACCOUNT_ID] })
const app = session.getAppWithLoggedInUser(getApp(), user)

describe.only('Service dashboard redirect to live account controller', function () {
  afterEach(() => nock.cleanAll())

  beforeEach(function () {
    console.log('1111 - user.toJson: ', user.toJson())
    userCreator.mockUserResponse(user.toJson())

    connectorMock
      .get(`/v1/frontend/accounts/${GATEWAY_ACCOUNT_ID}`)
      .reply(200, validGatewayAccountResponse({
        gateway_account_id: GATEWAY_ACCOUNT_ID,
        payment_provider: 'stripe',
        type: 'live'
      }).getPlain())

    connectorMock
      .get(`/v1/api/accounts/${GATEWAY_ACCOUNT_ID}/stripe-setup`)
      .reply(200, buildGetStripeAccountSetupResponse({
        bank_account: true,
        vat_number_company_number: true,
        responsible_person: true
      }))
  })

  it('should load the "Go live complete" page', async () => {
    const res = await supertest(app)
      .get(paths.stripe.addPspAccountDetails)
    const $ = cheerio.load(res.text)
    expect($('h1').text()).to.contain('Go live complete')
  })
})
