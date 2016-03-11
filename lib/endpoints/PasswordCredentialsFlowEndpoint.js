'use strict';

const httpHelper = require('../helpers/httpHelper');
const Query = require('catberry-uri').Query;
const PasswordCredentialsSender = require('../grants/PasswordCredentialsSender');
const GrantFlowMiddlewareBase = require('../middlewares/GrantFlowMiddlewareBase');

const CONTENT_TYPE = 'application/x-www-form-urlencoded';
const MAX_UPSTREAM_LENGTH = 512; // 0.5KB
const FIELD_USERNAME = 'username';
const FIELD_PASSWORD = 'password';
const FIELD_SCOPE = 'scope';

/**
 * Creates new instance of password credentials flow endpoint.
 * @param {ServiceLocator} locator Service locator to resolve
 * dependencies.
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
 */
class PasswordCredentialsFlowEndpoint extends GrantFlowMiddlewareBase {
	constructor(locator, authConfig, endpointConfig) {
		super(locator, endpointConfig);

		/**
		 * Current password credentials sender.
		 * @type {PasswordCredentialsSender}
		 * @private
		 */
		this._sender = new PasswordCredentialsSender(locator, authConfig);
	}

	/**
	 * Handles middleware endpoint.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	handler(request, response) {
		this._eventBus.emit('trace', 'Obtaining access token for password credentials...');
		this._obtainAuthorization(request)
			.then(issuedAuth => this._handleIssuedAuthorization(request, response, issuedAuth))
			.then(responseObject => httpHelper.writeToResponse(200, responseObject, response))
			.catch(reason => {
				this._eventBus.emit('error', reason);
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
		const methodError = httpHelper.checkMethod(request, 'post');
		if (methodError) {
			return Promise.reject(methodError);
		}

		const contentTypeError = httpHelper.checkContentType(request, CONTENT_TYPE);
		if (contentTypeError) {
			return Promise.reject(contentTypeError);
		}

		return new Promise((fulfill, reject) => {
			let upstream = '';
			request.setEncoding('utf8');
			request
				.on('data', chunk => {
					const lengthError = httpHelper.checkLength(
						upstream, chunk, MAX_UPSTREAM_LENGTH
					);

					if (lengthError) {
						reject(lengthError);
						return;
					}

					upstream += chunk;
				})
				.on('error', error => reject(error))
				.on('end', () => {
					const parsed = new Query(upstream.replace('+', '%20')).values;
					const username = parsed[FIELD_USERNAME];
					const password = parsed[FIELD_PASSWORD];
					const scope = parsed[FIELD_SCOPE] || this._scope;

					if (typeof (username) !== 'string') {
						const usernameError = new Error('"username" is required parameter');
						usernameError.code = 400;
						return reject(usernameError);
					}

					if (typeof (password) !== 'string') {
						const passwordError = new Error('"password" is required parameter');
						passwordError.code = 400;
						return reject(passwordError);
					}

					return this._sender.send(username, password, scope).then(fulfill, reject);
				});
		});
	}
}

module.exports = PasswordCredentialsFlowEndpoint;
