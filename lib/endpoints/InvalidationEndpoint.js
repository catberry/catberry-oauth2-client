'use strict';

const httpHelper = require('../helpers/httpHelper');
const URI = require('catberry-uri').URI;

const FIELD_TOKEN = 'token';
const FIELD_RETURN_URI = 'return_uri';

class InvalidationEndpoint {

	/**
	 * Creates new instance of token invalidation endpoint.
	 * @param {ServiceLocator} locator Service locator to resolve
	 * dependencies.
	 * @param {Object} authConfig Authorization configuration.
	 * @param {Object} endpointConfig Endpoint configuration.
	 * @param {Object} endpointConfig.cookie Token cookie configuration.
	 * @param {string} endpointConfig.cookie.accessTokenName Name of cookie
	 * with access token.
	 * @param {string?} endpointConfig.cookie.path Path attribute for cookie
	 * ('/' by default).
	 * @param {string?} endpointConfig.cookie.domain Domain attribute for cookie.
	 */
	/* eslint complexity: 0 */
	constructor(locator, authConfig, endpointConfig) {
		if (!endpointConfig || typeof (endpointConfig) !== 'object') {
			throw new Error('Config must be an object');
		}
		if (!endpointConfig.cookie || typeof (endpointConfig.cookie) !== 'object' ||
			typeof (endpointConfig.cookie.accessTokenName) !== 'string' ||
			endpointConfig.cookie.accessTokenName.length === 0 ||
			typeof (endpointConfig.cookie.refreshTokenName) !== 'string' ||
			endpointConfig.cookie.refreshTokenName.length === 0) {
			throw new Error('At least "cookie.accessTokenName" and "cookie.refreshTokenName" must be set');
		}

		/**
		 * Current name of cookie with access token.
		 * @type {string}
		 * @private
		 */
		this._accessTokenName = endpointConfig.cookie.accessTokenName || '';

		/**
		 * Current name of cookie with refresh token.
		 * @type {string}
		 * @private
		 */
		this._refreshTokenName = endpointConfig.cookie.refreshTokenName || '';

		/**
		 * Current path of cookie.
		 * @type {string}
		 * @private
		 */
		this._cookiePath = typeof (endpointConfig.cookie.path) === 'string' ? endpointConfig.cookie.path : '/';

		/**
		 * Current domain of cookie.
		 * @type {string}
		 * @private
		 */
		this._cookieDomain = typeof (endpointConfig.cookie.domain) === 'string' ? endpointConfig.cookie.domain : '';
	}

	/**
	 * Handles endpoint invocation.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 */
	handler(request, response) {
		const methodError = httpHelper.checkMethod(request, 'get');
		if (methodError) {
			httpHelper.writeError(methodError, response);
			return;
		}

		// anti CSRF protection token in query string must equals token from cookie
		const acessToken = httpHelper.getCookie(this._accessTokenName, request);
		const refreshToken = httpHelper.getCookie(this._refreshTokenName, request);
		const tokenError = this.checkToken(acessToken, request);
		if (tokenError) {
			httpHelper.writeError(tokenError, response);
			return;
		}

		if (acessToken) {
			// remove tokens from cookie
			// http://tools.ietf.org/html/rfc6265#section-3.1
			httpHelper.setCookie(request, response, {
				key: this._accessTokenName,
				value: '',
				path: this._cookiePath,
				domain: this._cookieDomain,
				expires: new Date(0),
				maxAge: 0
			});
		}

		if (refreshToken) {
			httpHelper.setCookie(request, response, {
				key: this._refreshTokenName,
				value: '',
				path: this._cookiePath,
				domain: this._cookieDomain,
				expires: new Date(0),
				maxAge: 0
			});
		}

		const uri = new URI(request.url);
		const returnUri = uri.query && uri.query.values[FIELD_RETURN_URI] ? new URI(uri.query.values[FIELD_RETURN_URI]) : null;
		if (returnUri) {
			httpHelper.redirectResponse(response, returnUri);
		} else {
			response.end();
		}
	}

	/**
	 * Checks if token equals to query string token parameter.
	 * @param {string} token Access token.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @returns {Error|null} Error if token is wrong.
	 */
	checkToken(token, request) {
		const uri = new URI(request.url);

		if (token && (!uri.query || uri.query.values[FIELD_TOKEN] !== token)) {
			const error = new Error('Wrong token specified for invalidation');
			error.code = 403;
			return error;
		}

		return null;
	}
}

module.exports = InvalidationEndpoint;
