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
    cy.setEncryptedCookies(AUTHENTICATED_USER_ID, 1)
    const authenticatedUserStubOpts = getUserStubOpts(AUTHENTICATED_USER_ID, 'logged-in-user@example.com', 'admin', 'Administrator')
    const userWeAreEditingStubOpts = getUserStubOpts(EDITING_USER_ID, 'other-user@example.com', 'admin', 'Administrator')

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
            userWeAreEditingStubOpts
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
    cy.visit(`/service/${SERVICE_EXTERNAL_ID}`)
  })
})
