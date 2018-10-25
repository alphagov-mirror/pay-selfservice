'use strict'

// NPM Dependencies
const lodash = require('lodash')
const AWSXRay = require('aws-xray-sdk')
const logger = require('winston')
const {getNamespace, createNamespace} = require('continuation-local-storage')

// Local Dependencies
const response = require('./utils/response.js').response
const generateRoute = require('./utils/generate_route')
const paths = require('./paths.js')

// - Middleware
const {lockOutDisabledUsers, enforceUserAuthenticated, enforceUserFirstFactor, redirectLoggedInUser} = require('./services/auth_service')
const {validateAndRefreshCsrf, ensureSessionHasCsrfSecret} = require('./middleware/csrf')
const getEmailNotification = require('./middleware/get_email_notification')
const getAccount = require('./middleware/get_gateway_account')
const hasServices = require('./middleware/has_services')
const resolveService = require('./middleware/resolve_service')
const trimUsername = require('./middleware/trim_username')
const {servicePermission, platformPermission} = require('./middleware/permission')
const paymentMethodIsCard = require('./middleware/payment-method-card')
const validateRegistrationInviteCookie = require('./middleware/validate_registration_invite_cookie')
const otpVerify = require('./middleware/otp_verify')
const correlationIdMiddleware = require('./middleware/correlation_id')
const getRequestContext = require('./middleware/get_request_context').middleware
const restrictToSandbox = require('./middleware/restrict_to_sandbox')
const xraySegmentCls = require('./middleware/x_ray')
const goCardlessRedirect = require('./middleware/partnerapp/handle_redirect_to_gocardless_connect')
const goCardlessOAuthGet = require('./middleware/partnerapp/handle_gocardless_connect_get')
const cookieMessage = require('./middleware/cookie_message')

// - Controllers
const staticCtrl = require('./controllers/static_controller')
const transactionsDownloadCtrl = require('./controllers/transactions/transaction_download_controller')
const transactionsListCtrl = require('./controllers/transactions/transaction_list_controller')
const transactionDetailCtrl = require('./controllers/transactions/transaction_detail_controller')
const transactionRefundCtrl = require('./controllers/transactions/transaction_refund_controller')
const credentialsCtrl = require('./controllers/credentials_controller')
const loginCtrl = require('./controllers/login')
const dashboardCtrl = require('./controllers/dashboard')
const healthcheckCtrl = require('./controllers/healthcheck_controller')
const apiKeysCtrl = require('./controllers/api-keys')
const paymentTypesSelectType = require('./controllers/payment_types_select_type_controller')
const paymentTypesSelectBrand = require('./controllers/payment_types_select_brand_controller')
const paymentTypesSummary = require('./controllers/payment_types_summary_controller')
const emailNotifications = require('./controllers/email_notifications/email_notifications_controller')
const forgotPassword = require('./controllers/forgotten_password_controller')
const myServicesCtrl = require('./controllers/my-services')
const editServiceNameCtrl = require('./controllers/edit_service_name_controller')
const serviceUsersController = require('./controllers/service_users_controller')
const merchantDetailsCtrl = require('./controllers/edit_merchant_details')
const inviteUserController = require('./controllers/invite_user_controller')
const registerCtrl = require('./controllers/register_user_controller')
const serviceRolesUpdateController = require('./controllers/service_roles_update_controller')
const toggle3ds = require('./controllers/toggle_3ds_controller')
const selfCreateServiceCtrl = require('./controllers/register_service_controller')
const createServiceCtrl = require('./controllers/create_service_controller')
const inviteValidationCtrl = require('./controllers/invite_validation_controller')
const testWithYourUsers = require('./controllers/test_with_your_users')
const makeADemoPayment = require('./controllers/make_a_demo_payment')
const paymentLinksCtrl = require('./controllers/payment-links')
const twoFactorAuthCtrl = require('./controllers/two-factor-auth-controller')
const feedbackCtrl = require('./controllers/feedback')
const platformAdminCtrl = require('./controllers/platform-admin')

// Assignments
const {
  healthcheck, registerUser, admin, user, dashboard, selfCreateService, transactions, credentials, feedback,
  apiKeys, serviceSwitcher, teamMembers, staticPaths, inviteValidation, editServiceName, merchantDetails,
  notificationCredentials: nc, paymentTypes: pt, emailNotifications: en, toggle3ds: t3ds, prototyping, paymentLinks, partnerApp
} = paths

// Exports
module.exports.generateRoute = generateRoute
module.exports.paths = paths

// Constants
const clsXrayConfig = require('../config/xray-cls')

module.exports.bind = function (app) {
  AWSXRay.enableManualMode()
  AWSXRay.setLogger(logger)
  AWSXRay.middleware.setSamplingRules('aws-xray.rules')
  AWSXRay.config([AWSXRay.plugins.ECSPlugin])
  app.use(AWSXRay.express.openSegment('pay_selfservice'))

  createNamespace(clsXrayConfig.nameSpaceName)

  app.get('/style-guide', (req, res) => response(req, res, 'style_guide'))

  // APPLY CORRELATION MIDDLEWARE
  app.use('*', correlationIdMiddleware, getRequestContext)

  app.use((req, res, next) => {
    const namespace = getNamespace(clsXrayConfig.nameSpaceName)
    namespace.bindEmitter(req)
    namespace.bindEmitter(res)
    namespace.run(() => {
      next()
    })
  })

  app.all(lockOutDisabledUsers) // On all requests, if there is a user, and its disabled, lock out.

  // ----------------------
  // UNAUTHENTICATED ROUTES
  // ----------------------

  // HEALTHCHECK
  app.get(healthcheck.path, healthcheckCtrl.healthcheck)

  // STATIC
  app.all(staticPaths.naxsiError, xraySegmentCls, staticCtrl.naxsiError)

  // VALIDATE INVITE
  app.get(inviteValidation.validateInvite, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, inviteValidationCtrl.validateInvite)

  // REGISTER USER
  app.get(registerUser.registration, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.showRegistration)
  app.get(registerUser.subscribeService, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.subscribeService)
  app.post(registerUser.registration, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.submitRegistration)
  app.get(registerUser.otpVerify, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.showOtpVerify)
  app.post(registerUser.otpVerify, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.submitOtpVerify)
  app.get(registerUser.reVerifyPhone, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.showReVerifyPhone)
  app.post(registerUser.reVerifyPhone, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, registerCtrl.submitReVerifyPhone)
  app.get(registerUser.logUserIn, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, loginCtrl.loginAfterRegister, enforceUserAuthenticated, hasServices, resolveService, getAccount, dashboardCtrl.dashboardActivity)

  // LOGIN
  app.get(user.logIn, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, redirectLoggedInUser, loginCtrl.loginGet)
  app.post(user.logIn, xraySegmentCls, cookieMessage, validateAndRefreshCsrf, trimUsername, loginCtrl.loginUser, hasServices, resolveService, getAccount, loginCtrl.postLogin)
  app.get(dashboard.index, xraySegmentCls, cookieMessage, enforceUserAuthenticated, validateAndRefreshCsrf, hasServices, resolveService, getAccount, dashboardCtrl.dashboardActivity)
  app.get(user.noAccess, xraySegmentCls, cookieMessage, loginCtrl.noAccess)
  app.get(user.logOut, xraySegmentCls, cookieMessage, loginCtrl.logout)
  app.get(user.otpSendAgain, xraySegmentCls, cookieMessage, enforceUserFirstFactor, validateAndRefreshCsrf, loginCtrl.sendAgainGet)
  app.post(user.otpSendAgain, xraySegmentCls, cookieMessage, enforceUserFirstFactor, validateAndRefreshCsrf, loginCtrl.sendAgainPost)
  app.get(user.otpLogIn, xraySegmentCls, cookieMessage, enforceUserFirstFactor, validateAndRefreshCsrf, loginCtrl.otpLogin)
  app.post(user.otpLogIn, xraySegmentCls, cookieMessage, validateAndRefreshCsrf, loginCtrl.loginUserOTP, loginCtrl.afterOTPLogin)

  // FORGOTTEN PASSWORD
  app.get(user.forgottenPassword, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, forgotPassword.emailGet)
  app.post(user.forgottenPassword, xraySegmentCls, cookieMessage, trimUsername, validateAndRefreshCsrf, forgotPassword.emailPost)
  app.get(user.passwordRequested, xraySegmentCls, cookieMessage, forgotPassword.passwordRequested)
  app.get(user.forgottenPasswordReset, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, forgotPassword.newPasswordGet)
  app.post(user.forgottenPasswordReset, xraySegmentCls, cookieMessage, validateAndRefreshCsrf, forgotPassword.newPasswordPost)

  // SELF CREATE SERVICE
  app.get(selfCreateService.register, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, selfCreateServiceCtrl.showRegistration)
  app.post(selfCreateService.register, xraySegmentCls, cookieMessage, trimUsername, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, selfCreateServiceCtrl.submitRegistration)
  app.get(selfCreateService.confirm, xraySegmentCls, cookieMessage, selfCreateServiceCtrl.showConfirmation)
  app.get(selfCreateService.otpVerify, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, validateRegistrationInviteCookie, selfCreateServiceCtrl.showOtpVerify)
  app.post(selfCreateService.otpVerify, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, validateRegistrationInviteCookie, otpVerify.verifyOtpForServiceInvite, selfCreateServiceCtrl.createPopulatedService)
  app.get(selfCreateService.otpResend, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, validateRegistrationInviteCookie, selfCreateServiceCtrl.showOtpResend)
  app.post(selfCreateService.otpResend, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, validateRegistrationInviteCookie, selfCreateServiceCtrl.submitOtpResend)
  app.get(selfCreateService.logUserIn, xraySegmentCls, cookieMessage, ensureSessionHasCsrfSecret, validateAndRefreshCsrf, loginCtrl.loginAfterRegister, enforceUserAuthenticated, getAccount, selfCreateServiceCtrl.loggedIn)
  app.get(selfCreateService.serviceNaming, xraySegmentCls, cookieMessage, enforceUserAuthenticated, validateAndRefreshCsrf, hasServices, getAccount, selfCreateServiceCtrl.showNameYourService)
  app.post(selfCreateService.serviceNaming, xraySegmentCls, cookieMessage, enforceUserAuthenticated, validateAndRefreshCsrf, hasServices, getAccount, selfCreateServiceCtrl.submitYourServiceName)

  // GOCARDLESS PARTNER APP
  app.get(partnerApp.oauthComplete, xraySegmentCls, cookieMessage, goCardlessOAuthGet.index)

  // ----------------------
  // AUTHENTICATED ROUTES
  // ----------------------

  const authenticatedPaths = [
    ...lodash.values(transactions),
    ...lodash.values(credentials),
    ...lodash.values(nc),
    ...lodash.values(apiKeys),
    ...lodash.values(pt),
    ...lodash.values(en),
    ...lodash.values(editServiceName),
    ...lodash.values(serviceSwitcher),
    ...lodash.values(teamMembers),
    ...lodash.values(t3ds),
    ...lodash.values(merchantDetails),
    ...lodash.values(prototyping.demoPayment),
    ...lodash.values(prototyping.demoService),
    ...lodash.values(paymentLinks),
    ...lodash.values(user.twoFactorAuth),
    ...lodash.values(partnerApp),
    paths.feedback
  ] // Extract all the authenticated paths as a single array

  app.use(authenticatedPaths, xraySegmentCls, enforceUserAuthenticated, validateAndRefreshCsrf, cookieMessage) // Enforce authentication on all get requests
  app.use(authenticatedPaths.filter(item => !lodash.values(serviceSwitcher).includes(item)), xraySegmentCls, hasServices) // Require services everywhere but the switcher page

  //  TRANSACTIONS
  app.get(transactions.index, xraySegmentCls, servicePermission('transactions:read'), getAccount, paymentMethodIsCard, transactionsListCtrl)
  app.get(transactions.download, xraySegmentCls, servicePermission('transactions-download:read'), getAccount, paymentMethodIsCard, transactionsDownloadCtrl)
  app.get(transactions.detail, xraySegmentCls, servicePermission('transactions-details:read'), getAccount, paymentMethodIsCard, transactionDetailCtrl)
  app.post(transactions.refund, xraySegmentCls, servicePermission('refunds:create'), getAccount, paymentMethodIsCard, transactionRefundCtrl)

  // CREDENTIALS
  app.get(credentials.index, xraySegmentCls, servicePermission('gateway-credentials:read'), getAccount, paymentMethodIsCard, credentialsCtrl.index)
  app.get(credentials.edit, xraySegmentCls, servicePermission('gateway-credentials:update'), getAccount, paymentMethodIsCard, credentialsCtrl.editCredentials)
  app.post(credentials.index, xraySegmentCls, servicePermission('gateway-credentials:update'), getAccount, paymentMethodIsCard, credentialsCtrl.update)

  app.get(nc.index, xraySegmentCls, servicePermission('gateway-credentials:read'), getAccount, paymentMethodIsCard, credentialsCtrl.index)
  app.get(nc.edit, xraySegmentCls, servicePermission('gateway-credentials:update'), getAccount, paymentMethodIsCard, credentialsCtrl.editNotificationCredentials)
  app.post(nc.update, xraySegmentCls, servicePermission('gateway-credentials:update'), getAccount, paymentMethodIsCard, credentialsCtrl.updateNotificationCredentials)

  // MERCHANT DETAILS
  app.get(merchantDetails.index, xraySegmentCls, servicePermission('merchant-details:read'), merchantDetailsCtrl.getIndex)
  app.get(merchantDetails.edit, xraySegmentCls, servicePermission('merchant-details:update'), merchantDetailsCtrl.getEdit)
  app.post(merchantDetails.edit, xraySegmentCls, servicePermission('merchant-details:update'), merchantDetailsCtrl.postEdit)

  // API KEYS
  app.get(apiKeys.index, xraySegmentCls, servicePermission('tokens-active:read'), getAccount, apiKeysCtrl.getIndex)
  app.get(apiKeys.revoked, xraySegmentCls, servicePermission('tokens-revoked:read'), getAccount, apiKeysCtrl.getRevoked)
  app.get(apiKeys.create, xraySegmentCls, servicePermission('tokens:create'), getAccount, apiKeysCtrl.getCreate)
  app.post(apiKeys.create, xraySegmentCls, servicePermission('tokens:create'), getAccount, apiKeysCtrl.postCreate)
  app.post(apiKeys.revoke, xraySegmentCls, servicePermission('tokens:delete'), getAccount, apiKeysCtrl.postRevoke)
  app.post(apiKeys.update, xraySegmentCls, servicePermission('tokens:update'), getAccount, apiKeysCtrl.postUpdate)

  // PAYMENT TYPES
  app.get(pt.selectType, xraySegmentCls, servicePermission('payment-types:read'), getAccount, paymentMethodIsCard, paymentTypesSelectType.selectType)
  app.post(pt.selectType, xraySegmentCls, servicePermission('payment-types:update'), getAccount, paymentMethodIsCard, paymentTypesSelectType.updateType)
  app.get(pt.selectBrand, xraySegmentCls, servicePermission('payment-types:read'), getAccount, paymentMethodIsCard, paymentTypesSelectBrand.showBrands)
  app.post(pt.selectBrand, xraySegmentCls, servicePermission('payment-types:update'), getAccount, paymentMethodIsCard, paymentTypesSelectBrand.updateBrands)
  app.get(pt.summary, xraySegmentCls, servicePermission('payment-types:read'), getAccount, paymentMethodIsCard, paymentTypesSummary.showSummary)

  // EMAIL
  app.get(en.index, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.index)
  app.get(en.indexRefundTabEnabled, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.indexRefundTabEnabled)
  app.get(en.edit, xraySegmentCls, servicePermission('email-notification-paragraph:update'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.edit)
  app.post(en.confirm, xraySegmentCls, servicePermission('email-notification-paragraph:update'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.confirm)
  app.post(en.update, xraySegmentCls, servicePermission('email-notification-paragraph:update'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.update)
  app.get(en.collection, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.collectionEmailIndex)
  app.post(en.collection, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.collectionEmailUpdate)
  app.get(en.confirmation, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.confirmationEmailIndex)
  app.post(en.confirmation, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.confirmationEmailUpdate)
  app.post(en.off, xraySegmentCls, servicePermission('email-notification-toggle:update'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.confirmationEmailOff)
  app.post(en.on, xraySegmentCls, servicePermission('email-notification-toggle:update'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.confirmationEmailOn)
  app.get(en.refund, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.refundEmailIndex)
  app.post(en.refund, xraySegmentCls, servicePermission('email-notification-template:read'), getAccount, getEmailNotification, paymentMethodIsCard, emailNotifications.refundEmailUpdate)

  // SERVICE SWITCHER
  app.get(serviceSwitcher.index, xraySegmentCls, myServicesCtrl.getIndex)
  app.post(serviceSwitcher.switch, xraySegmentCls, myServicesCtrl.postIndex)
  app.get(serviceSwitcher.create, xraySegmentCls, createServiceCtrl.get)
  app.post(serviceSwitcher.create, xraySegmentCls, createServiceCtrl.post)

  // EDIT SERVICE NAME
  app.get(editServiceName.index, xraySegmentCls, servicePermission('service-name:update'), editServiceNameCtrl.get)
  app.post(editServiceName.update, xraySegmentCls, servicePermission('service-name:update'), editServiceNameCtrl.post)

  // TEAM MEMBERS - USER PROFILE
  app.get(teamMembers.index, xraySegmentCls, resolveService, serviceUsersController.index)
  app.get(teamMembers.show, xraySegmentCls, servicePermission('users-service:read'), serviceUsersController.show)
  app.get(teamMembers.permissions, xraySegmentCls, servicePermission('users-service:create'), serviceRolesUpdateController.index)
  app.post(teamMembers.permissions, xraySegmentCls, servicePermission('users-service:create'), serviceRolesUpdateController.update)
  app.post(teamMembers.delete, xraySegmentCls, servicePermission('users-service:delete'), serviceUsersController.delete)
  app.get(user.profile, xraySegmentCls, enforceUserAuthenticated, serviceUsersController.profile)

  // TEAM MEMBERS - INVITE
  app.get(teamMembers.invite, xraySegmentCls, servicePermission('users-service:create'), inviteUserController.index)
  app.post(teamMembers.invite, xraySegmentCls, servicePermission('users-service:create'), inviteUserController.invite)

  // 3D SECURE TOGGLE
  app.get(t3ds.index, xraySegmentCls, servicePermission('toggle-3ds:read'), getAccount, paymentMethodIsCard, toggle3ds.index)
  app.post(t3ds.onConfirm, xraySegmentCls, servicePermission('toggle-3ds:update'), getAccount, paymentMethodIsCard, toggle3ds.onConfirm)
  app.post(t3ds.on, xraySegmentCls, servicePermission('toggle-3ds:update'), getAccount, paymentMethodIsCard, toggle3ds.on)
  app.post(t3ds.off, xraySegmentCls, servicePermission('toggle-3ds:update'), getAccount, paymentMethodIsCard, toggle3ds.off)

  // PROTOTYPING
  app.get(prototyping.demoService.index, xraySegmentCls, servicePermission('transactions:read'), resolveService, getAccount, restrictToSandbox, testWithYourUsers.index)
  app.get(prototyping.demoService.links, xraySegmentCls, servicePermission('transactions:read'), resolveService, getAccount, restrictToSandbox, testWithYourUsers.links)
  app.get(prototyping.demoService.create, xraySegmentCls, servicePermission('transactions:read'), resolveService, getAccount, restrictToSandbox, testWithYourUsers.create)
  app.post(prototyping.demoService.confirm, xraySegmentCls, servicePermission('transactions:read'), resolveService, getAccount, restrictToSandbox, testWithYourUsers.submit)
  app.get(prototyping.demoService.disable, xraySegmentCls, servicePermission('transactions:read'), resolveService, getAccount, restrictToSandbox, testWithYourUsers.disable)

  app.get(prototyping.demoPayment.index, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.index)
  app.post(prototyping.demoPayment.index, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.index)
  app.get(prototyping.demoPayment.editDescription, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.edit)
  app.get(prototyping.demoPayment.editAmount, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.edit)
  app.get(prototyping.demoPayment.mockCardDetails, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.mockCardDetails)
  app.post(prototyping.demoPayment.goToPaymentScreens, xraySegmentCls, servicePermission('transactions:read'), getAccount, restrictToSandbox, makeADemoPayment.goToPayment)

  // CREATE PAYMENT LINKS
  app.get(paymentLinks.start, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getStart)
  app.get(paymentLinks.information, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getInformation)
  app.post(paymentLinks.information, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postInformation)
  app.get(paymentLinks.webAddress, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getWebAddress)
  app.post(paymentLinks.webAddress, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postWebAddress)
  app.get(paymentLinks.reference, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getReference)
  app.post(paymentLinks.reference, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postReference)
  app.get(paymentLinks.amount, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getAmount)
  app.post(paymentLinks.amount, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postAmount)
  app.get(paymentLinks.review, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getReview)
  app.post(paymentLinks.review, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postReview)
  app.get(paymentLinks.manage, xraySegmentCls, servicePermission('transactions:read'), getAccount, paymentLinksCtrl.getManage)
  app.get(paymentLinks.disable, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getDisable)
  app.get(paymentLinks.delete, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getDelete)
  app.get(paymentLinks.edit, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getEdit)
  app.post(paymentLinks.edit, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postEdit)
  app.get(paymentLinks.editInformation, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getEditInformation)
  app.post(paymentLinks.editInformation, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postEditInformation)
  app.get(paymentLinks.editAmount, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.getEditAmount)
  app.post(paymentLinks.editAmount, xraySegmentCls, servicePermission('tokens:create'), getAccount, paymentLinksCtrl.postEditAmount)

  // CONFIGURE 2FA
  app.get(user.twoFactorAuth.index, xraySegmentCls, twoFactorAuthCtrl.getIndex)
  app.post(user.twoFactorAuth.index, xraySegmentCls, twoFactorAuthCtrl.postIndex)
  app.get(user.twoFactorAuth.configure, xraySegmentCls, twoFactorAuthCtrl.getConfigure)
  app.post(user.twoFactorAuth.configure, xraySegmentCls, twoFactorAuthCtrl.postConfigure)
  app.post(user.twoFactorAuth.resend, xraySegmentCls, twoFactorAuthCtrl.postResend)

  // FEEDBACK
  app.get(feedback, xraySegmentCls, hasServices, resolveService, getAccount, feedbackCtrl.getIndex)
  app.post(feedback, xraySegmentCls, hasServices, resolveService, getAccount, feedbackCtrl.postIndex)

  // PARTNER APP LINK GOCARDLESS ACCOUNT
  app.get(partnerApp.linkAccount, xraySegmentCls, getAccount, goCardlessRedirect.index)

  // PLATFORM ADMIN
  app.get(admin.indexPlatformAdmin, xraySegmentCls, platformPermission('platform-admin:read'), platformAdminCtrl.getIndex)
  app.get(admin.indexPlatformAdminTrialServices, xraySegmentCls, platformPermission('platform-admin:read'), platformAdminCtrl.getIndexTrialServices)
  app.get(admin.serviceTeamMembers, xraySegmentCls, platformPermission('platform-admin:read'), platformAdminCtrl.getServiceTeamMembers)
  app.get(admin.serviceOrganisationDetails, xraySegmentCls, platformPermission('platform-admin:read'), platformAdminCtrl.getServiceOrganisationDetails)

  app.all('*', (req, res) => {
    res.status(404)
    res.render('404')
  })

  app.use(AWSXRay.express.closeSegment())
}
