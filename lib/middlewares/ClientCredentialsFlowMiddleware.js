'use strict';

const httpHelper = require('../helpers/httpHelper');
const ClientCredentialsSender = require('../grants/ClientCredentialsSender');
const GrantFlowMiddlewareBase = require('./GrantFlowMiddlewareBase');

class ClientCredentialsFlowMiddleware extends GrantFlowMiddlewareBase {

	/**
	 * Creates new instance of client credentials flow middleware.
	 * @param {ServiceLocator} locator Service locator to resolve
	 * dependencies.
	 * @param {Object} authConfig Middleware configuration.
	 * @param {string} authConfig.clientId Id of OAuth 2.0 client.
	 * @param {string} authConfig.clientSecret Secret of OAuth 2.0 client.
	 * @param {string} authConfig.authServerUrl URL to OAuth 2.0
	 * authentication server.
	 * @param {number?} authConfig.timeout Grant send timeout (30000 ms by default).
	 * @param {boolean?} authConfig.unsafeHTTPS Determines if sender will send grant
	 * via unsafe HTTPS connection with invalid certificate (false by default).
	 * @param {string?} authConfig.tokenEndpointPath URL path to
	 * OAuth 2.0 token endpoint (/token by default).
	 * @param {Object} endpointConfig Endpoint configuration.
	 * @param {string?} endpointConfig.scope Access scope for middleware.
	 * @param {Object} endpointConfig.cookie Token cookie configuration.
	 * @param {string} endpointConfig.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} endpointConfig.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization
	 * server (3 600 secs by default, 1 hour).
	 * @param {string} endpointConfig.cookie.refreshTokenName Name of cookie
	 * with refresh token.
	 * @param {string?} endpointConfig.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie
	 * (3 110 400 000 secs by default, 100 years).
	 * @param {string?} endpointConfig.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} endpointConfig.cookie.domain Domain attribute for cookie.
	 */
	constructor(locator, authConfig, endpointConfig) {
		super(locator, endpointConfig);

		/**
		 * Current client credentials sender.
		 * @type {ClientCredentialsSender}
		 * @private
		 */
		this._sender = new ClientCredentialsSender(locator, authConfig);
	}

	/**
	 * Handles middleware invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Function} next Next function of middleware queue.
	 */
	handler(request, response, next) {
		const accessToken = httpHelper.getCookie(this._cookieConfig.accessTokenName, request);

		if (typeof (accessToken) === 'string') {
			next();
			return;
		}

		this._eventBus.emit('trace', 'Obtaining access token for client credentials...');
		this._obtainAuthorization(request)
			.then(issuedAuth => this._handleIssuedAuthorization(request, response, issuedAuth))
			.then(() => next())
			.catch(reason => {
				this._eventBus.emit('error', reason);
				next();
			});
	}

	/**
	 * Obtains authorization from authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @returns {Promise<Object>} Promise for issued authorization.
	 * @protected
	 */
	_obtainAuthorization(request) {
		return this._sender.send(request, this._scope);
	}
}

module.exports = ClientCredentialsFlowMiddleware;
