'use strict'

const SERVICE_EXTERNAL_ID = 'service_abc_123'
const AUTHENTICATED_USER_ID = 'authenticated-user-id'
const EDITING_USER_ID = 'user-we-are-editing-id'

const getUserStubOpts = function (userExternalId, email, roleName, roleDescription) {
  return {
    external_id: userExternalId,
    username: email,
    email: email,
    service_roles: [
      {
        service: {
          external_id: SERVICE_EXTERNAL_ID
        },
        role: {
          name: roleName,
          description: roleDescription
        }
      }
    ]
  }
}

describe('Edit service user permissions', () => {
  beforeEach(() => {
    Cypress.Cookies.preserveOnce('session')
    Cypress.Cookies.preserveOnce('gateway_account')

    const authenticatedUserStubOpts = getUserStubOpts(AUTHENTICATED_USER_ID, 'logged-in-user@example.com', 'admin', 'Administrator')
    const userWeAreEditingStubOpts = getUserStubOpts(EDITING_USER_ID, 'other-user@example.com', 'admin', 'Administrator')
    const viewOnlyUserStubOpts = getUserStubOpts('view-only-user-id', 'view-only-user@example.com', 'view-only', 'View Only')
    const viewAndRefundUserStubOpts = getUserStubOpts('view-and-refund-user-id', 'view-and-refund-user@example.com', 'view-and-refund', 'View And Refund')

    cy.task('setupStubs', [
      {
        name: 'getUserSuccess',
        opts: authenticatedUserStubOpts
      },
      {
        name: 'getUserSuccess',
        opts: userWeAreEditingStubOpts
      },
      {
        name: 'getServiceUsersSuccess',
        opts: {
          serviceExternalId: SERVICE_EXTERNAL_ID,
          users: [
            authenticatedUserStubOpts,
            userWeAreEditingStubOpts,
            viewOnlyUserStubOpts,
            viewAndRefundUserStubOpts
          ]
        }
      },
      {
        name: 'getInvitedUsersSuccess',
        opts: {
          serviceExternalId: SERVICE_EXTERNAL_ID,
          invites: [
            { email: 'invited_user1@example.com' },
            { email: 'invited_user2@example.com' }
          ]
        }
      }
    ])
  })

  it('should display team members page', () => {
    cy.setEncryptedCookies(AUTHENTICATED_USER_ID, 1)

    cy.visit(`/service/${SERVICE_EXTERNAL_ID}`)

    cy.get('#team-members-admin-list > table').find('tr').first().find('td').first().find('a').contains('logged-in-user@example.com (you)')
    cy.get('#team-members-admin-list > table').find('tr').eq(1).find('td').first().find('a').contains('other-user@example.com')
    cy.get('#team-members-view-and-refund-list > table').find('tr').first().find('td').first().find('a').contains('view-and-refund-user@example.com')
    cy.get('#team-members-view-only-list > table').find('tr').first().find('td').first().find('a').contains('view-only-user@example.com')
  })

  it('should redirect to team member details page', () => {
    cy.get('a').contains('other-user@example.com').click()

    cy.get('h1').contains('Details for other-user@example.com')
    cy.get('table').find('tr').first().find('td').first().contains('other-user@example.com')
    cy.get('table').find('tr').eq(1).find('td').first().contains('Administrator')
    cy.get('table').find('tr').eq(1).find('td').eq(1).find('a').contains('Edit permissions')
  })

  it('should redirect to edit user permissions page', () => {
    cy.get('a').contains('Edit permissions').click()
    cy.get('#role-admin-input').should('exist').should('have.attr', 'checked')
  })

  it('should update permission', () => {
    cy.get('#role-view-and-refund-input').click()
    cy.get('button').contains('Save changes').click()
  })
})
