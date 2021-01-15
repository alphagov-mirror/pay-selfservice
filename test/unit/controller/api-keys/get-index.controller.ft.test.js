'use strict'

const { expect } = require('chai')
const nock = require('nock')
const supertest = require('supertest')

const { getApp } = require('../../../../server')
const mockSession = require('../../../test-helpers/mock-session')
const userCreator = require('../../../test-helpers/user-creator')
const paths = require('../../../../app/paths')
const gatewayAccountFixtures = require('../../../fixtures/gateway-account.fixtures')
const formatAccountPathsFor = require('../../../../app/utils/format-account-paths-for')

const { PUBLIC_AUTH_URL, CONNECTOR_URL } = process.env

const GATEWAY_ACCOUNT_ID = '182364'
const EXTERNAL_GATEWAY_ACCOUNT_ID = 'an-external-id'

const apiKeysIndexPath = formatAccountPathsFor(paths.account.apiKeys.index, EXTERNAL_GATEWAY_ACCOUNT_ID)

const TOKEN_1 = {
  issued_date: '15 May 2018 - 09:13',
  last_used: null,
  token_link: 'fb3f3892-558e-4adb-8efa-6eed3b207713',
  description: 'Hello World',
  token_type: 'CARD',
  created_by: 'TKAS4OIpm2qpC7qxEP45Uuql410HQqmE@example.com'
}

const TOKEN_2 = {
  issued_date: '14 May 2018 - 14:18',
  last_used: '14 May 2018 - 14:26',
  token_link: 'd7c4ff92-a3f6-4443-a1cb-3123591730ae',
  description: 'Token for “A better service name” payment link',
  token_type: 'CARD',
  created_by: 'TKAS4OIpm2qpC7qxEP45Uuql410HQqmE@example.com'
}

const mockGetActiveAPIKeys = gatewayAccountId => {
  return nock(PUBLIC_AUTH_URL).get(`/${gatewayAccountId}`)
}

describe('API keys index', () => {
  let app
  before(function () {
    const user = mockSession.getUser({
      gateway_account_ids: [GATEWAY_ACCOUNT_ID], permissions: [{ name: 'tokens-active:read' }]
    })
    app = mockSession.getAppWithLoggedInUser(getApp(), user)
    userCreator.mockUserResponse(user.toJson())
  })

  describe('when no API keys exist', () => {
    let response
    before(function (done) {
      mockConnectorGetAccount()
      mockGetActiveAPIKeys(GATEWAY_ACCOUNT_ID).reply(200, [])

      supertest(app)
        .get(apiKeysIndexPath)
        .set('Accept', 'application/json')
        .end((err, res) => {
          response = res
          done(err)
        })
    })

    after(() => {
      nock.cleanAll()
    })

    it('should return API keys with state active', () => {
      expect(response.body.token_state).to.equal('active')
    })
    it('should not return any API keys', () => {
      expect(response.body.tokens.length).to.equal(0)
    })
  })

  describe('when one API key exists', () => {
    let response
    before(function (done) {
      mockConnectorGetAccount()
      mockGetActiveAPIKeys(GATEWAY_ACCOUNT_ID).reply(200, { tokens: [TOKEN_1] })

      supertest(app)
        .get(apiKeysIndexPath)
        .set('Accept', 'application/json')
        .end((err, res) => {
          response = res
          done(err)
        })
    })

    after(() => {
      nock.cleanAll()
    })

    it('should return API keys with state active', () => {
      expect(response.body.token_state).to.equal('active')
    })

    it('should return one API key', () => {
      expect(response.body.tokens.length).to.equal(1)
    })

    it('should return tokens_singular as true', () => {
      expect(response.body.tokens_singular).to.equal(true)
    })
  })

  describe('when more than one API key exists', () => {
    let response
    before(function (done) {
      mockConnectorGetAccount()
      mockGetActiveAPIKeys(GATEWAY_ACCOUNT_ID).reply(200, { tokens: [TOKEN_1, TOKEN_2] })

      supertest(app)
        .get(apiKeysIndexPath)
        .set('Accept', 'application/json')
        .end((err, res) => {
          response = res
          done(err)
        })
    })

    after(() => {
      nock.cleanAll()
    })

    it('should return API keys with state active', () => {
      expect(response.body.token_state).to.equal('active')
    })

    it('should return two API key', () => {
      expect(response.body.tokens.length).to.equal(2)
    })

    it('should return tokens_singular as false', () => {
      expect(response.body.tokens_singular).to.equal(false)
    })
  })
})

function mockConnectorGetAccount () {
  nock(CONNECTOR_URL).get(`/v1/api/accounts/external-id/${EXTERNAL_GATEWAY_ACCOUNT_ID}`)
    .reply(200, gatewayAccountFixtures.validGatewayAccountResponse(
      {
        external_id: EXTERNAL_GATEWAY_ACCOUNT_ID,
        gateway_account_id: GATEWAY_ACCOUNT_ID
      }
    ))
}
