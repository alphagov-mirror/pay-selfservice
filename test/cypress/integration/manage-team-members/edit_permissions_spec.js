'use strict'

const SERVICE_EXTERNAL_ID = 'service_abc_123'
const AUTHENTICATED_USER_ID = 'authenticated-user-id'
const EDITING_USER_ID = 'user-we-are-editing-id'

const getUserStubOpts = function (userExternalId, roleName, roleDescription) {
  return {
    external_id: userExternalId,
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
    const authenticatedUserStubOpts = getUserStubOpts(AUTHENTICATED_USER_ID, 'admin', 'Administrator')
    const userWeAreEditingStubOpts = getUserStubOpts(EDITING_USER_ID, 'admin', 'Administrator')

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

        }
      }
    ]
    )
  })
})
