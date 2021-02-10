'use strict'

const gatewayAccountStubs = require('../../stubs/gateway-account-stubs')
const userStubs = require('../../stubs/user-stubs')

const userExternalId = 'authenticated-user-id'

describe('Service has a live account that supports payouts', () => {
  beforeEach(() => {
    cy.task('setupStubs', [
      userStubs.getUserSuccess({ userExternalId, gatewayAccountId: '1' }),
      gatewayAccountStubs.getGatewayAccountsSuccess({ gatewayAccountId: '1' })
    ])
  })

  it(`should display the notification banner and hide it after clicking the 'hide message' button`, () => {
    cy.setEncryptedCookies(userExternalId, 1)
    cy.visit('/my-services')
    cy.get('#my-services-whats-new-notification').should('exist')

    // click hide button and check hidden
    cy.get('#my-services-whats-new-notification__hide-button').click()
    cy.get('#my-services-whats-new-notification').should('not.exist')

    // check not shown when page is reloaded
    cy.visit('/my-services')
    cy.get('#my-services-whats-new-notification').should('not.exist')
  })
})
