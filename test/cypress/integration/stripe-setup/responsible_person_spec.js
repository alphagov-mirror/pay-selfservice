'use strict'

const commonStubs = require('../../utils/common_stubs')

describe('Stripe setup: responsible person page', () => {
  const gatewayAccountId = 42
  const userExternalId = 'userExternalId'

  const firstName = 'William'
  const typedFirstName = 'William '
  const lastName = 'Benn'
  const typedLastName = ' Benn'
  const addressLine1 = '52 Festive Road'
  const typedAddressLine1 = ' 52 Festive Road'
  const addressLine2 = 'Putney'
  const typedAddressLine2 = 'Putney '
  const city = 'London'
  const typedCity = 'London '
  const postcode = 'SW15 1LP'
  const typedPostcode = 'sw151lp '
  const dobDay = '25'
  const typedDobDay = '25 '
  const dobMonth = '02'
  const typedDobMonth = ' 02'
  const dobYear = '1971'
  const typedDobYear = '1971 '
  const friendlyDob = '25 February 1971'
  const longText = 'This text is 300 ................................................................................' +
    '...............................................................................................................' +
    '............................................................................ characters long'

  const stubStripeAccountGet = function stubStripeAccountGet (stripeAccountId) {
    return {
      name: 'getStripeAccountSuccess',
      opts: {
        gateway_account_id: gatewayAccountId,
        stripe_account_id: stripeAccountId
      }
    }
  }

  const stubStripeSetupGet = function stubStripeSetupGet (responsiblePersonCompleted) {
    return {
      name: 'getGatewayAccountStripeSetupSuccess',
      opts: {
        gateway_account_id: gatewayAccountId,
        responsible_person: responsiblePersonCompleted
      }
    }
  }

  const stubStripeSetupGetForMultipleCalls = function stubStripeSetupGetForMultipleCalls (...responsiblePersonCompleted) {
    const data = responsiblePersonCompleted.map(completed => (
      {
        responsible_person: completed
      }
    ))
    return {
      name: 'getGatewayAccountStripeSetupFlagChanged',
      opts: {
        gateway_account_id: gatewayAccountId,
        data: data
      }
    }
  }

  beforeEach(() => {
    cy.setEncryptedCookies(userExternalId, gatewayAccountId)
  })

  describe('when user is admin, account is Stripe and responsible person not already nominated', () => {
    beforeEach(() => {
      cy.task('setupStubs', [
        commonStubs.getUserStub(userExternalId, [gatewayAccountId]),
        commonStubs.getGatewayAccountStub(gatewayAccountId, 'live', 'stripe'),
        stubStripeSetupGet(false),
        stubStripeAccountGet('acct_123example123')
      ])

      cy.visit('/responsible-person')
    })

    it('should display form', () => {
      cy.get('h1').should('contain', 'Nominate a responsible person')

      cy.get('#responsible-person-form').should('exist')
        .within(() => {
          cy.get('label[for="first-name"]').should('exist')
          cy.get('input#first-name[name="first-name"][autocomplete="given-name"]').should('exist')

          cy.get('label[for="last-name"]').should('exist')
          cy.get('input#last-name[name="last-name"][autocomplete="family-name"]').should('exist')

          cy.get('label[for="home-address-line-1"]').should('exist')
          cy.get('input#home-address-line-1[name="home-address-line-1"][autocomplete="address-line1"]').should('exist')
          cy.get('input#home-address-line-2[name="home-address-line-2"][autocomplete="address-line2"]').should('exist')

          cy.get('label[for="home-address-city"]').should('exist')
          cy.get('input#home-address-city[name="home-address-city"][autocomplete="address-level2"]').should('exist')

          cy.get('label[for="home-address-postcode"]').should('exist')
          cy.get('input#home-address-postcode[name="home-address-postcode"][autocomplete="postal-code"]').should('exist')

          cy.get('label[for="dob-day"]').should('exist')
          cy.get('input#dob-day[name="dob-day"][autocomplete="bday-day"]').should('exist')

          cy.get('label[for="dob-month"]').should('exist')
          cy.get('input#dob-month[name="dob-month"][autocomplete="bday-month"]').should('exist')

          cy.get('label[for="dob-year"]').should('exist')
          cy.get('input#dob-year[name="dob-year"][autocomplete="bday-year"]').should('exist')

          cy.get('button').should('exist')

          cy.get('input[name="answers-need-changing"]').should('not.exist')
          cy.get('input[name="answers-checked"]').should('not.exist')
        })
    })

    it('should display check answers page with second address line', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedFirstName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(typedAddressLine2)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(typedPostcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('h1').should('contain', 'Check details before saving')

      cy.get('#responsible-person-check-display-form').within(() => {
        cy.get('input[type=hidden][name="first-name"]').should('have.attr', 'value', firstName)
        cy.get('input[type=hidden][name="last-name"]').should('have.attr', 'value', lastName)

        cy.get('input[type=hidden][name="home-address-line-1"]').should('have.attr', 'value', addressLine1)
        cy.get('input[type=hidden][name="home-address-line-2"]').should('have.attr', 'value', addressLine2)
        cy.get('input[type=hidden][name="home-address-city"]').should('have.attr', 'value', city)
        cy.get('input[type=hidden][name="home-address-postcode"]').should('have.attr', 'value', postcode)

        cy.get('input[type=hidden][name="dob-day"]').should('have.attr', 'value', dobDay)
        cy.get('input[type=hidden][name="dob-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input[type=hidden][name="dob-year"]').should('have.attr', 'value', dobYear)

        cy.get('.govuk-summary-list').within(() => {
          cy.get('.govuk-summary-list__row:nth-child(1) .govuk-summary-list__value').should('contain', firstName)
          cy.get('.govuk-summary-list__row:nth-child(2) .govuk-summary-list__value').should('contain', lastName)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', addressLine1)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', addressLine2)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', city)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', postcode)
          cy.get('.govuk-summary-list__row:nth-child(4) .govuk-summary-list__value').should('contain', friendlyDob)

          cy.get('button').should('exist')
        })
      })

      cy.get('#responsible-person-check-submit-form').within(() => {
        cy.get('input[type=hidden][name="first-name"]').should('have.attr', 'value', firstName)
        cy.get('input[type=hidden][name="last-name"]').should('have.attr', 'value', lastName)

        cy.get('input[type=hidden][name="home-address-line-1"]').should('have.attr', 'value', addressLine1)
        cy.get('input[type=hidden][name="home-address-line-2"]').should('have.attr', 'value', addressLine2)
        cy.get('input[type=hidden][name="home-address-city"]').should('have.attr', 'value', city)
        cy.get('input[type=hidden][name="home-address-postcode"]').should('have.attr', 'value', postcode)

        cy.get('input[type=hidden][name="dob-day"]').should('have.attr', 'value', dobDay)
        cy.get('input[type=hidden][name="dob-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input[type=hidden][name="dob-year"]').should('have.attr', 'value', dobYear)

        cy.get('button').should('exist')
      })
    })

    it('should display check answers page without second address line', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedFirstName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(typedPostcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('h1').should('contain', 'Check details before saving')

      cy.get('#responsible-person-check-display-form').within(() => {
        cy.get('input[type=hidden][name="first-name"]').should('have.attr', 'value', firstName)
        cy.get('input[type=hidden][name="last-name"]').should('have.attr', 'value', lastName)

        cy.get('input[type=hidden][name="home-address-line-1"]').should('have.attr', 'value', addressLine1)
        cy.get('input[type=hidden][name="home-address-city"]').should('have.attr', 'value', city)
        cy.get('input[type=hidden][name="home-address-postcode"]').should('have.attr', 'value', postcode)

        cy.get('input[type=hidden][name="dob-day"]').should('have.attr', 'value', dobDay)
        cy.get('input[type=hidden][name="dob-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input[type=hidden][name="dob-year"]').should('have.attr', 'value', dobYear)

        cy.get('.govuk-summary-list').within(() => {
          cy.get('.govuk-summary-list__row:nth-child(1) .govuk-summary-list__value').should('contain', firstName)
          cy.get('.govuk-summary-list__row:nth-child(2) .govuk-summary-list__value').should('contain', lastName)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', addressLine1)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', city)
          cy.get('.govuk-summary-list__row:nth-child(3) .govuk-summary-list__value').should('contain', postcode)
          cy.get('.govuk-summary-list__row:nth-child(4) .govuk-summary-list__value').should('contain', friendlyDob)

          cy.get('button').should('exist')
        })
      })

      cy.get('#responsible-person-check-submit-form').within(() => {
        cy.get('input[type=hidden][name="first-name"]').should('have.attr', 'value', firstName)
        cy.get('input[type=hidden][name="last-name"]').should('have.attr', 'value', lastName)

        cy.get('input[type=hidden][name="home-address-line-1"]').should('have.attr', 'value', addressLine1)
        cy.get('input[type=hidden][name="home-address-city"]').should('have.attr', 'value', city)
        cy.get('input[type=hidden][name="home-address-postcode"]').should('have.attr', 'value', postcode)

        cy.get('input[type=hidden][name="dob-day"]').should('have.attr', 'value', dobDay)
        cy.get('input[type=hidden][name="dob-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input[type=hidden][name="dob-year"]').should('have.attr', 'value', dobYear)

        cy.get('button').should('exist')
      })
    })

    it('should allow going back to change answers', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedFirstName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(typedAddressLine2)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(typedPostcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('h1').should('contain', 'Check details before saving')

      cy.get('#first-name-change-button').should('exist')
      cy.get('#last-name-change-button').should('exist')
      cy.get('#home-address-change-button').should('exist')
      cy.get('#date-of-birth-change-button').should('exist')

      cy.get('#first-name-change-button').click()

      cy.get('h1').should('contain', 'Nominate a responsible person')

      cy.get('#responsible-person-form').should('exist').within(() => {
        cy.get('input#first-name[name="first-name"][autocomplete="given-name"]').should('have.attr', 'value', firstName)
        cy.get('input#last-name[name="last-name"][autocomplete="family-name"]').should('have.attr', 'value', lastName)

        cy.get('input#home-address-line-1[name="home-address-line-1"][autocomplete="address-line1"]').should('have.attr', 'value', addressLine1)
        cy.get('input#home-address-line-2[name="home-address-line-2"][autocomplete="address-line2"]').should('have.attr', 'value', addressLine2)
        cy.get('input#home-address-city[name="home-address-city"][autocomplete="address-level2"]').should('have.attr', 'value', city)
        cy.get('input#home-address-postcode[name="home-address-postcode"][autocomplete="postal-code"]').should('have.attr', 'value', postcode)

        cy.get('input#dob-day[name="dob-day"][autocomplete="bday-day"]').should('have.attr', 'value', dobDay)
        cy.get('input#dob-month[name="dob-month"][autocomplete="bday-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input#dob-year[name="dob-year"][autocomplete="bday-year"]').should('have.attr', 'value', dobYear)

        cy.get('button').should('exist')

        cy.get('input[name="answers-need-changing"]').should('not.exist')
        cy.get('input[name="answers-checked"]').should('not.exist')
      })
    })

    it('should show errors when validation fails', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedFirstName)
        // No last name, which is an error
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(typedAddressLine2)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type('not a valid UK postcode')
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#last-name"]').should('contain', 'Last name')
      })

      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#home-address-postcode"]').should('contain', 'Postcode')
      })

      cy.get('#responsible-person-form').should('exist').within(() => {
        cy.get('.govuk-form-group--error > input#last-name').parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#last-name[name=last-name][autocomplete=family-name]').should('exist')
        })

        cy.get('.govuk-form-group--error > input#home-address-postcode').parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#home-address-postcode[name=home-address-postcode][autocomplete=postal-code]').should('have.attr', 'value', 'not a valid UK postcode')
        })

        cy.get('input#first-name[name="first-name"][autocomplete="given-name"]').should('have.attr', 'value', firstName)
        cy.get('input#last-name[name="last-name"][autocomplete="family-name"]').should('exist')
        cy.get('input#home-address-line-1[name="home-address-line-1"][autocomplete="address-line1"]').should('have.attr', 'value', addressLine1)
        cy.get('input#home-address-line-2[name="home-address-line-2"][autocomplete="address-line2"]').should('have.attr', 'value', addressLine2)
        cy.get('input#home-address-city[name="home-address-city"][autocomplete="address-level2"]').should('have.attr', 'value', city)
        cy.get('input#dob-day[name="dob-day"][autocomplete="bday-day"]').should('have.attr', 'value', dobDay)
        cy.get('input#dob-month[name="dob-month"][autocomplete="bday-month"]').should('have.attr', 'value', dobMonth)
        cy.get('input#dob-year[name="dob-year"][autocomplete="bday-year"]').should('have.attr', 'value', dobYear)

        cy.get('button').should('exist')

        cy.get('input[name="answers-need-changing"]').should('not.exist')
        cy.get('input[name="answers-checked"]').should('not.exist')
      })
    })

    it('should show error for second address line using first address line label', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedLastName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(longText)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(postcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#home-address-line-2"]').should('contain', 'Home address')
      })

      cy.get('#responsible-person-form').should('exist').within(() => {
        cy.get('.govuk-form-group--error > input#home-address-line-2').parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#home-address-line-2').should('have.attr', 'value', longText)
        })
      })
    })

    it('should only show address once in error summary if error in both address lines', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedLastName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(longText)
        cy.get('#home-address-line-2').type(longText)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(postcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#home-address-line-1"]').should('contain', 'Home address')
        cy.get('a[href="#home-address-line-2"]').should('not.exist')
      })

      cy.get('#responsible-person-form').should('exist').within(() => {
        cy.get('.govuk-form-group--error > input#home-address-line-1').parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#home-address-line-1').should('have.attr', 'value', longText)
        })
        cy.get('.govuk-form-group--error > input#home-address-line-2').parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#home-address-line-2').should('have.attr', 'value', longText)
        })
      })
    })

    it('should error when validation for the date of birth fails', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedLastName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(typedAddressLine2)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(postcode)
        cy.get('#dob-day').type('29')
        cy.get('#dob-month').type('2')
        cy.get('#dob-year').type('2001')
        cy.get('button').click()
      })

      cy.get('.govuk-error-summary').should('exist').within(() => {
        cy.get('a[href="#dob-day"]').should('contain', 'Date of birth')
        cy.get('a[href="#dob-month"]').should('not.exist')
        cy.get('a[href="#dob-year"]').should('not.exist')
      })

      cy.get('#responsible-person-form').should('exist').within(() => {
        cy.get('.govuk-form-group--error > fieldset > #dob-error').parent().parent().should('exist').within(() => {
          cy.get('.govuk-error-message').should('exist')
          cy.get('input#dob-day').should('have.attr', 'value', '29')
          cy.get('input#dob-month').should('have.attr', 'value', '2')
          cy.get('input#dob-year').should('have.attr', 'value', '2001')
        })
      })
    })
  })

  describe('trying to view form when responsible person already nominated', () => {
    beforeEach(() => {
      cy.task('setupStubs', [
        commonStubs.getUserStub(userExternalId, [gatewayAccountId]),
        commonStubs.getGatewayAccountStub(gatewayAccountId, 'live', 'stripe'),
        stubStripeSetupGet(true),
        stubStripeAccountGet('acct_123example123'),
        commonStubs.getDashboardStatisticsStub()
      ])

      cy.visit('/responsible-person')
    })

    it('should redirect to dashboard with error message instead of showing form', () => {
      cy.get('h1').should('contain', 'Dashboard')
      cy.location().should((location) => {
        expect(location.pathname).to.eq('/')
      })
      cy.get('.flash-container .generic-error').should('contain', 'responsible person')
    })
  })

  describe('trying to save details when responsible person already nominated', function () {
    beforeEach(() => {
      cy.task('setupStubs', [
        commonStubs.getUserStub(userExternalId, [gatewayAccountId]),
        commonStubs.getGatewayAccountStub(gatewayAccountId, 'live', 'stripe'),
        stubStripeSetupGetForMultipleCalls(false, false, true),
        stubStripeAccountGet('acct_123example123'),
        commonStubs.getDashboardStatisticsStub()
      ])

      cy.visit('/responsible-person')
    })

    it('should redirect to dashboard with error message instead of saving details', () => {
      cy.get('#responsible-person-form').within(() => {
        cy.get('#first-name').type(typedFirstName)
        cy.get('#last-name').type(typedLastName)
        cy.get('#home-address-line-1').type(typedAddressLine1)
        cy.get('#home-address-line-2').type(typedAddressLine2)
        cy.get('#home-address-city').type(typedCity)
        cy.get('#home-address-postcode').type(typedPostcode)
        cy.get('#dob-day').type(typedDobDay)
        cy.get('#dob-month').type(typedDobMonth)
        cy.get('#dob-year').type(typedDobYear)
        cy.get('button').click()
      })

      cy.get('h1').should('contain', 'Check details before saving')

      cy.get('#responsible-person-check-submit-form > button').click()

      cy.get('h1').should('contain', 'Dashboard')
      cy.location().should((location) => {
        expect(location.pathname).to.eq('/')
      })
      cy.get('.flash-container .generic-error').should('contain', 'responsible person')
    })
  })

  describe('when it’s not a Stripe gateway account', () => {
    beforeEach(() => {
      cy.task('setupStubs', [
        commonStubs.getUserStub(userExternalId, [gatewayAccountId]),
        commonStubs.getGatewayAccountStub(gatewayAccountId, 'live', 'worldpay'),
        stubStripeSetupGet(false),
        stubStripeAccountGet('acct_123example123')
      ])

      cy.visit('/responsible-person', { failOnStatusCode: false })
    })

    it('should return a 404', () => {
      cy.get('h1').should('contain', 'Page not found')
    })
  })

  describe('when user has incorrect permissions', () => {
    beforeEach(() => {
      cy.task('setupStubs', [
        commonStubs.getUserWithNoPermissionsStub(userExternalId, [gatewayAccountId]),
        commonStubs.getGatewayAccountStub(gatewayAccountId, 'live', 'stripe'),
        stubStripeSetupGet(false),
        stubStripeAccountGet('acct_123example123')
      ])

      cy.visit('/responsible-person')
    })

    it('should show a permission denied error', () => {
      cy.get('h1').should('contain', 'An error occurred')
      cy.get('#errorMsg').should('contain', 'not have the administrator rights')
    })
  })
})
