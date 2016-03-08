'use strict';

const URI = require('catberry-uri').URI;
const httpHelper = require('../helpers/httpHelper');
const AuthorizationCodeSender = require('../grants/AuthorizationCodeSender');
const GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

const FIELD_CODE = 'code';

class AuthorizationCodeFlowEndpoint extends GrantFlowMiddlewareBase {

	/**
	 * Creates new instance of authorization code flow endpoint.
	 * @param {ServiceLocator} locator Service locator to resolve
	 * dependencies.
	 *
	 * @param {Object} authConfig Authorization configuration.
	 * @param {string} authConfig.clientId Id of OAuth 2.0 client.
	 * @param {string} authConfig.clientSecret Secret of OAuth 2.0 client.
	 * @param {string} authConfig.authServerUrl URL to OAuth 2.0
	 * authentication server.
	 * @param {number?} authConfig.timeout Grant send timeout (30000 ms by default).
	 * @param {boolean?} authConfig.unsafeHTTPS Determines if sender will send grant
	 * via unsafe HTTPS connection with invalid certificate (false by default).
	 * @param {string?} authConfig.tokenEndpointPath URL path to
	 * OAuth 2.0 token endpoint (/token by default).
	 *
	 * @param {Object} endpointConfig Endpoint configuration.
	 * @param {string?} endpointConfig.scope Access scope for endpoint.
	 * @param {string} endpointConfig.redirectUri Redirect URI used for
	 * obtaining code.
	 * @param {string} endpointConfig.returnUri Return URI used to redirect
	 * user agent after authorization.
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
	 *
	 * @extends GrantFlowMiddlewareBase
	 */
	constructor(locator, authConfig, endpointConfig) {
		super(locator, endpointConfig);

		/**
		 * Current authorization code sender.
		 * @type {AuthorizationCodeSender}
		 * @private
		 */
		this._sender = new AuthorizationCodeSender(locator, authConfig);
		if (typeof (endpointConfig.redirectUri) !== 'string' ||	endpointConfig.redirectUri.length === 0) {
			throw new Error('"redirectUri" not found in config');
		}

		/**
		 * Current redirect URI used for obtaining authorization.
		 * @type {string}
		 * @private
		 */
		this._redirectUri = endpointConfig.redirectUri;

		if (typeof (endpointConfig.returnUri) !== 'string' ||	endpointConfig.returnUri.length === 0) {
			throw new Error('"returnUri" not found in config');
		}

		/**
		 * Current return URI used to redirect user agent after authorization.
		 * @type {URI}
		 * @private
		 */
		this._returnUri = new URI(endpointConfig.returnUri);
	}

	/**
	 * Handles endpoint invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	handler(request, response) {
		this._logger.trace('Obtaining access token for authorization code...');
		this._obtainAuthorization(request)
			.then(issuedAuth => this._handleIssuedAuthorization(request, response, issuedAuth))
			.then(() => httpHelper.redirectResponse(response, this._returnUri))
			.catch(reason => {
				this._logger.error(reason);
				httpHelper.writeError(reason, response);
			});
	}

	/**
	 * Obtains authorization from authorization server.
	 * @param {http.IncomingMessage} request Incoming HTTP request.
	 * @returns {Promise<Object>} Promise for issued authorization.
	 * @private
	 */
	_obtainAuthorization(request) {
		const methodError = httpHelper.checkMethod(request, 'get');
		if (methodError) {
			return Promise.reject(methodError);
		}

		const uri = new URI(request.url);
		if (!uri.query || typeof (uri.query.values.code) !== 'string') {
			const error = new Error('"code" is required parameter');
			error.code = 400;
			return Promise.reject(error);
		}
		return this._sender.send(uri.query.values[FIELD_CODE], this._redirectUri);
	}
}

module.exports = AuthorizationCodeFlowEndpoint;
