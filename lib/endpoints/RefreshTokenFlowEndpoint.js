'use strict';

const catberryURI = require('catberry-uri');
const URI = catberryURI.URI;
const Query = catberryURI.Query;
const uriHelper = require('../helpers/uriHelper');
const httpHelper = require('../helpers/httpHelper');
const RefreshTokenSender = require('../grants/RefreshTokenSender');
const GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

const FIELD_RETURN_URI = 'return_uri';

class RefreshTokenFlowEndpoint extends GrantFlowMiddlewareBase {

	/**
	 * Creates new instance of refresh token flow endpoint.
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
		 * Current client credentials sender.
		 * @type {RefreshTokenSender}
		 * @private
		 */
		this._sender = new RefreshTokenSender(locator, authConfig);
	}

	/**
	 * Handles endpoint invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	handler(request, response) {
		const uri = new URI(request.url);
		const returnUri = uri.query && uri.query.values[FIELD_RETURN_URI] ? new URI(uri.query.values[FIELD_RETURN_URI]) : null;

		this._logger.trace('Obtaining access token for refresh token...');

		this._obtainAuthorization(request)
			.then(issuedAuth => this._handleIssuedAuthorization(request, response, issuedAuth))
			.then(responseObject => {
				if (returnUri) {
					httpHelper.redirectResponse(response, returnUri);
				} else {
					httpHelper.writeToResponse(200, responseObject, response);
				}
			})
			.catch(reason => {
				const accessToken = httpHelper.getCookie(this._cookieConfig.accessTokenName, request);
				const removeUri = new URI();

				this._logger.error(reason);

				removeUri.path = uriHelper.getRemovePath(this._endpointName);
				removeUri.query = new Query();
				removeUri.query.values = {};

				if (accessToken) {
					removeUri.query.values.token = accessToken;
				}

				if (returnUri) {
					removeUri.query.values[FIELD_RETURN_URI] = returnUri;
				}

				httpHelper.redirectResponse(response, removeUri);
			});
	}

	/**
	 * Obtains authorization from authorization server.
	 * @param {IncomingMessage} request Incoming HTTP request.
	 * @returns {Promise<Object>} Promise for issued authorization.
	 * @private
	 */
	_obtainAuthorization(request) {
		const refreshToken = httpHelper.getCookie(this._cookieConfig.refreshTokenName, request);

		if (typeof (refreshToken) !== 'string') {
			const tokenError = new Error('Refresh token must be specified');
			tokenError.code = 400;
			return Promise.reject(tokenError);
		}

		return this._sender.send(refreshToken, this._scope);
	}
}

module.exports = RefreshTokenFlowEndpoint;
