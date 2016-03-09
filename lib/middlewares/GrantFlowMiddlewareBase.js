'use strict';

const httpHelper = require('../helpers/httpHelper');

const FIELD_ACCESS_TOKEN = 'access_token';
const FIELD_REFRESH_TOKEN = 'refresh_token';
const FIELD_TOKEN_TYPE = 'token_type';
const DEFAULT_ACCESS_TOKEN_EXPIRATION = 3600;
const DEFAULT_REFRESH_TOKEN_EXPIRATION = 3110400000; // about 100 years;

class GrantFlowMiddlewareBase {

	/**
	 * Creates new instance of grant flow middleware.
	 * @param {ServiceLocator} locator Service locator
	 * to resolve dependencies.
	 *
	 * @param {Object} endpointConfig Endpoint configuration.
	 * @param {string?} endpointConfig.scope Access scope for middleware.
	 * @param {Object} endpointConfig.cookie Token cookie configuration.
	 * @param {string} endpointConfig.cookie.accessTokenName Name of cookie with access token.
	 * @param {string?} endpointConfig.cookie.accessTokenExpiresIn Expiration time
	 * in seconds for access token cookie if it is not specified by authorization server (3 600 secs by default, 1 hour).
	 * @param {string} endpointConfig.cookie.refreshTokenName Name of cookie with refresh token.
	 * @param {string?} endpointConfig.cookie.refreshTokenExpiresIn Expiration time
	 * in seconds for refresh token cookie (3 110 400 000 secs by default, 100 years).
	 * @param {string?} endpointConfig.cookie.path Path attribute for cookie ('/' by default).
	 * @param {string?} endpointConfig.cookie.domain Domain attribute for cookie.
	 */
	constructor(locator, endpointConfig) {
		validateConfig(endpointConfig);

		/**
		 * Current logger.
		 * @type {Logger}
		 * @protected
		 */
		this._logger = locator.resolve('logger');

		/**
		 * Current name of endpoint.
		 * @type {string}
		 * @protected
		 */
		this._endpointName = endpointConfig.name;

		/**
		 * Current OAuth 2.0 scope of the access request.
		 * http://tools.ietf.org/html/rfc6749#section-3.3.
		 * @type {string}
		 * @protected
		 */
		this._scope = typeof (endpointConfig.scope) === 'string' ? endpointConfig.scope : '';

		/**
		 * Current cookie configuration.
		 * @type {Object}
		 * @protected
		 */
		this._cookieConfig = Object.create(endpointConfig.cookie);

		if (typeof (this._cookieConfig.path) !== 'string' || this._cookieConfig.path.length === 0) {
			this._cookieConfig.path = '/';
		}

		if (typeof (this._cookieConfig.domain) !== 'string' || this._cookieConfig.domain.length === 0) {
			this._cookieConfig.domain = '';
		}

		if (typeof (this._cookieConfig.accessTokenExpiresIn) !== 'number' || this._cookieConfig.accessTokenExpiresIn < 0) {
			this._cookieConfig.accessTokenExpiresIn = DEFAULT_ACCESS_TOKEN_EXPIRATION;
		}

		if (typeof (this._cookieConfig.refreshTokenExpiresIn) !== 'number' || this._cookieConfig.refreshTokenExpiresIn < 0) {
			this._cookieConfig.refreshTokenExpiresIn = DEFAULT_REFRESH_TOKEN_EXPIRATION;
		}

	}

	/**
	 * Handles middleware invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Function} next Middleware next function.
	 * @abstract
	 */
	handler(request, response, next) {
		next();
	}

	/**
	 * Sets access token and refresh token to cookie in request and response.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Object} issuedAuth Issued authorization object.
	 * @param {string} issuedAuth.access_token Access token.
	 * @param {string} issuedAuth.token_type Access token type.
	 * @param {number?} issuedAuth.expires_in Time in seconds from now
	 * when access token expires.
	 * @param {string?} issuedAuth.refresh_token Refresh token.
	 * @param {string?} issuedAuth.scope Access token scope.
	 * @protected
	 */
	_handleIssuedAuthorization(request, response, issuedAuth) {
		validateIssuedAuth(issuedAuth);

		this._logger.trace('Authorization issued from server');

		const accessTokenSetup = this._getCookieSetup(
			this._cookieConfig.accessTokenName,
			issuedAuth[FIELD_ACCESS_TOKEN],
			this._cookieConfig.accessTokenExpiresIn
		);

		httpHelper.setCookie(request, response, accessTokenSetup);

		if (typeof (issuedAuth[FIELD_REFRESH_TOKEN]) === 'string') {
			const refreshTokenSetup = this._getCookieSetup(
				this._cookieConfig.refreshTokenName,
				issuedAuth[FIELD_REFRESH_TOKEN],
				this._cookieConfig.refreshTokenExpiresIn
			);
			refreshTokenSetup.httpOnly = true;
			httpHelper.setCookie(request, response, refreshTokenSetup);
		}

		return issuedAuth;
	}

	/**
	 * Gets cookie setup object.
	 * @param {string} name Cookie name.
	 * @param {string?} value Cookie value.
	 * @param {number} expiresIn Expiration of cookie in seconds.
	 * @returns {Object} Cookie setup object.
	 * @private
	 */
	_getCookieSetup(name, value, expiresIn) {
		value = String(value);
		const setup = {
			key: name,
			value
		};

		if (typeof (this._cookieConfig.domain) === 'string' || this._cookieConfig.domain.length !== 0) {
			setup.domain = this._cookieConfig.domain;
		}
		if (typeof (this._cookieConfig.path) === 'string' || this._cookieConfig.path.length !== 0) {
			setup.path = this._cookieConfig.path;
		}
		if (typeof (this._cookieConfig.secure) === 'boolean') {
			setup.secure = this._cookieConfig.secure;
		}

		if (typeof (setup.maxAge) !== 'number') {
			setup.maxAge = expiresIn;
		}

		return setup;
	}
}

/**
 * Validates middleware configuration.
 * @param {Object} config Configuration object.
 */
function validateConfig(config) {

	/* eslint complexity: 0 */
	if (!config || typeof (config) !== 'object') {
		throw new Error('Config must be an object');
	}
	if (typeof (config.name) !== 'string' || config.name.length === 0) {
		throw new Error('Endpoint name must be specified');
	}

	if (!config.cookie || typeof (config.cookie) !== 'object' ||
		typeof (config.cookie.accessTokenName) !== 'string' ||
		config.cookie.accessTokenName.length === 0 ||
		typeof (config.cookie.refreshTokenName) !== 'string' ||
		config.cookie.refreshTokenName.length === 0) {
		throw new Error('At least two parameters: "cookie.accessTokenName" and "cookie.refreshTokenName" must be set');
	}
}

/**
 * Validates issued authorization from authorization server.
 * @param {Object} issuedAuth Issues authorization object.
 */
function validateIssuedAuth(issuedAuth) {
	// http://tools.ietf.org/html/rfc6749#section-5.1
	if (typeof (issuedAuth[FIELD_ACCESS_TOKEN]) !== 'string') {
		const tokenError = new Error('Response from authorization server does not have required "access_token" field');
		tokenError.code = 500;
		throw tokenError;
	}
	if (typeof (issuedAuth[FIELD_TOKEN_TYPE]) !== 'string') {
		const tokenTypeError = new Error('Response from authorization server does not have required "token_type" field');
		tokenTypeError.code = 500;
		throw tokenTypeError;
	}
	if (issuedAuth[FIELD_TOKEN_TYPE].toLowerCase() !== 'bearer') {
		const wrongTokenTypeError = new Error('Only Bearer token type is supported');
		wrongTokenTypeError.code = 500;
		throw wrongTokenTypeError;
	}
}

module.exports = GrantFlowMiddlewareBase;
