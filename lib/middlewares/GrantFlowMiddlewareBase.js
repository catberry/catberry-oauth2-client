/*
 * catberry-oauth
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-oauth's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry-oauth that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = GrantFlowMiddlewareBase;

var cookieHelper = require('../helpers/cookieHelper'),
	RefreshTokenSender = require('../grants/RefreshTokenSender');

var COOKIE_NULL_VALUE = 'null',
	FIELD_ACCESS_TOKEN = 'access_token',
	FIELD_REFRESH_TOKEN = 'refresh_token',
	FIELD_EXPIRES_IN = 'expires_in',
	FIELD_TOKEN_TYPE = 'token_type',
	TRACE_AUTH_RECEIVED = 'Authorization issued from server',
	TRACE_OBTAIN_TOKEN = 'Obtaining access token...',
	DEFAULT_ACCESS_TOKEN_EXPIRATION = 3600,
	DEFAULT_REFRESH_TOKEN_EXPIRATION = 3110400000, // about 100 years
	ERROR_NOT_IMPLEMENTED = 'This method not implemented',
	ERROR_RESPONSE_ACCESS_TOKEN = 'Response from authorization server ' +
		'does not have required access_token field',
	ERROR_RESPONSE_TOKEN_TYPE = 'Response from authorization server ' +
		'does not have required token_type field',
	ERROR_RESPONSE_TOKEN_TYPE_NOT_SUPPORTED = 'Only Bearer token type ' +
		'is supported',
	ERROR_COOKIE_CONFIG = 'At least two parameters: ' +
		'cookie.accessTokenName and cookie.refreshTokenName must be set',
	ERROR_CONFIG = 'Config must be an object';

/**
 * Creates new instance of grant flow middleware.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @param {Object} config Middleware configuration.
 * @param {String?} config.scope Access scope for middleware.
 * @param {Object} config.cookie Token cookie configuration.
 * @param {String} config.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} config.cookie.accessTokenExpiresIn Expiration time
 * in seconds for access token cookie if it is not specified by authorization
 * server (3 600 secs by default, 1 hour).
 * @param {String} config.cookie.refreshTokenName Name of cookie
 * with refresh token.
 * @param {String?} config.cookie.refreshTokenExpiresIn Expiration time
 * in seconds for refresh token cookie
 * (3 110 400 000 secs by default, 100 years).
 * @param {String?} config.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} config.cookie.domain Domain attribute for cookie.
 * @param {String} config.clientId Id of OAuth 2.0 client.
 * @param {String} config.clientSecret Secret of OAuth 2.0 client.
 * @param {String} config.authServerUrl URL to OAuth 2.0 authentication server.
 * @param {Number?} config.timeout Grant send timeout (30000 ms by default).
 * @param {Boolean?} config.unsafeHTTPS Determines if sender will send grant
 * via unsafe HTTPS connection with invalid certificate (false by default).
 * @param {String?} config.tokenEndPointPath URL path to
 * OAuth 2.0 token endpoint (/token by default).
 * @constructor
 */
function GrantFlowMiddlewareBase($serviceLocator, config) {
	validateConfig(config);
	this._refreshTokenSender = new RefreshTokenSender($serviceLocator, config);
	this._logger = $serviceLocator.resolve('logger');
	this._cookieConfig = Object.create(config.cookie);
	if (typeof(this._cookieConfig.path) !== 'string' ||
		this._cookieConfig.path.length === 0) {
		this._cookieConfig.path = '/';
	}
	if (typeof(this._cookieConfig.domain) !== 'string' ||
		this._cookieConfig.domain.length === 0) {
		this._cookieConfig.domain = '';
	}
	if (typeof(this._cookieConfig.accessTokenExpiresIn) !== 'number' ||
		this._cookieConfig.accessTokenExpiresIn < 0) {
		this._cookieConfig.accessTokenExpiresIn =
			DEFAULT_ACCESS_TOKEN_EXPIRATION;
	}
	if (typeof(this._cookieConfig.refreshTokenExpiresIn) !== 'number' ||
		this._cookieConfig.refreshTokenExpiresIn < 0) {
		this._cookieConfig.refreshTokenExpiresIn =
			DEFAULT_REFRESH_TOKEN_EXPIRATION;
	}
	this._scope = typeof(config.scope) === 'string' ?
		config.scope :
		this._scope;
}

/**
 * Current refresh token sender.
 * @type {RefreshTokenSender}
 * @private
 */
GrantFlowMiddlewareBase.prototype._refreshTokenSender = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
GrantFlowMiddlewareBase.prototype._logger = null;

/**
 * Current cookie configuration.
 * @type {Object}
 * @private
 */
GrantFlowMiddlewareBase.prototype._cookieConfig = null;

/**
 * Current OAuth 2.0 scope of the access request.
 * http://tools.ietf.org/html/rfc6749#section-3.3.
 * @type {string}
 * @protected
 */
GrantFlowMiddlewareBase.prototype._scope = '';

/**
 * Determines if this middleware must end with HTTP response or
 * invoke next function.
 * @type {boolean}
 * @private
 */
GrantFlowMiddlewareBase.prototype._isResponseNeeded = false;

/**
 * Handles middleware invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Function} next Next function of middleware queue.
 */
GrantFlowMiddlewareBase.prototype.handler = function (request, response, next) {
	var accessToken = this._getCookie(
		this._cookieConfig.accessTokenName, request
	);

	if (typeof(accessToken) === 'string') {
		if (this._isResponseNeeded) {
			writeToResponse(200, {}, response);
		} else {
			next();
		}
		return;
	}

	var self = this,
		refreshToken = this._getCookie(
			this._cookieConfig.refreshTokenName, request
		);

	this._logger.trace(TRACE_OBTAIN_TOKEN);

	if (typeof(refreshToken) === 'string') {
		this._refreshTokenSender
			.send(refreshToken, this._scope)
			.then(function (issuedAuth) {
				self._handleIssuedAuthorization(
					request, response, issuedAuth, next
				);
			})
			.then(null, function () {
				self._getAccessToken(request, response, next);
			});
	} else {
		this._getAccessToken(request, response, next);
	}
};

/**
 * Gets access token from authorization server.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Function} next Next function of middleware queue.
 * @returns {Promise} Promise for nothing.
 * @private
 */
GrantFlowMiddlewareBase.prototype._getAccessToken =
	function (request, response, next) {
		var self = this;
		return this._obtainAuthorization(request)
			.then(function (issuedAuth) {
				self._handleIssuedAuthorization(
					request, response, issuedAuth, next
				);
			})
			.then(null, function (reason) {
				self._handleError(response, reason, next);
			});
	};

/**
 * Obtains authorization from authorization server.
 * @param {http.IncomingMessage} request Incoming HTTP request.
 * @returns {Promise<Object>} Promise for issued authorization.
 * @abstract
 * @protected
 */
GrantFlowMiddlewareBase.prototype._obtainAuthorization = function (request) {
	return Promise.reject(new Error(ERROR_NOT_IMPLEMENTED));
};

/**
 * Sets access token and refresh token to cookie in request and response.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Object} issuedAuth Issued authorization object.
 * @param {String} issuedAuth.access_token Access token.
 * @param {String} issuedAuth.token_type Access token type.
 * @param {Number?} issuedAuth.expires_in Time in seconds from now
 * when access token expires.
 * @param {String?} issuedAuth.refresh_token Refresh token.
 * @param {String?} issuedAuth.scope Access token scope.
 * @param {Function} next Next function.
 * @private
 */
GrantFlowMiddlewareBase.prototype._handleIssuedAuthorization =
	function (request, response, issuedAuth, next) {
		validateIssuedAuth(issuedAuth);
		this._logger.trace(TRACE_AUTH_RECEIVED);
		var accessTokenExpiration =
					typeof(issuedAuth[FIELD_EXPIRES_IN]) === 'number' ?
				issuedAuth[FIELD_EXPIRES_IN] :
				this._cookieConfig.accessTokenExpiresIn,
			accessTokenSetup = this._getCookieSetup(
				this._cookieConfig.accessTokenName,
				issuedAuth[FIELD_ACCESS_TOKEN], accessTokenExpiration
			);

		this._setCookie(request, response, accessTokenSetup);

		if (typeof(issuedAuth[FIELD_REFRESH_TOKEN]) !== 'string') {
			return;
		}
		var refreshTokenSetup = this._getCookieSetup(
			this._cookieConfig.refreshTokenName,
			issuedAuth[FIELD_REFRESH_TOKEN],
			this._cookieConfig.refreshTokenExpiresIn
		);
		this._setCookie(request, response, refreshTokenSetup);

		if (!this._isResponseNeeded) {
			next();
			return;
		}
		var responseObject = {};

		Object.keys(issuedAuth)
			.forEach(function (key) {
				if (key === FIELD_ACCESS_TOKEN ||
					key === FIELD_REFRESH_TOKEN) {
					return;
				}
				responseObject[key] = issuedAuth[key];
			});
		writeToResponse(200, responseObject, response);
	};

/**
 * Handles error during authorization process and send it to user agent
 * if required.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Error} reason Error object.
 * @param {Function} next Next function of middleware queue.
 * @protected
 */
GrantFlowMiddlewareBase.prototype._handleError =
	function (response, reason, next) {
		this._logger.error(reason);
		if (!this._isResponseNeeded) {
			next();
			return;
		}
		var toSend = reason.details && typeof(reason.details) === 'object' ?
				reason.details : {error: reason.message},
			code = typeof(reason.code) === 'number' ? reason.code : 400;

		writeToResponse(code, toSend, response);
	};

/**
 * Gets access token from Cookie header in request.
 * @param {String} name Cookie name.
 * @param {http.IncomingMessage} request HTTP request.
 * @returns {string}
 * @private
 */
GrantFlowMiddlewareBase.prototype._getCookie =
	function (name, request) {
		if (!request.headers || !request.headers.cookie) {
			return null;
		}

		var cookies = cookieHelper.getFromRequest(request);
		return cookies[name] || null;
	};

/**
 * Sets access token to Set-Cookie response header.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Object} cookieSetup Cookie setup object.
 * @private
 */
GrantFlowMiddlewareBase.prototype._setCookie =
	function (request, response, cookieSetup) {
		// set access token to request as cookie for next middleware
		if (!request.headers) {
			request.headers = {};
		}
		request.headers.cookie = request.headers.cookie ?
			request.headers.cookie + '; ' :
			'';
		request.headers.cookie += cookieSetup.key + '=' + cookieSetup.value;

		cookieHelper.setToResponse(response, cookieSetup);
	};

/**
 * Gets cookie setup object.
 * @param {String} name Cookie name.
 * @param {String?} value Cookie value.
 * @param {Number} expiresIn Expiration of cookie in seconds.
 * @param {Boolean} isSession Is it session cookie and will be removed when
 * browser's tab is closed.
 * @returns {Object} Cookie setup object.
 * @private
 */
GrantFlowMiddlewareBase.prototype._getCookieSetup =
	function (name, value, expiresIn, isSession) {
		value = String(value);
		var setup = {
			key: name,
			value: value
		};

		if (typeof(this._cookieConfig.domain) === 'string' ||
			this._cookieConfig.domain.length !== 0) {
			setup.domain = this._cookieConfig.domain;
		}
		if (typeof(this._cookieConfig.path) === 'string' ||
			this._cookieConfig.path.length !== 0) {
			setup.path = this._cookieConfig.path;
		}
		if (typeof(this._cookieConfig.secure) === 'boolean') {
			setup.secure = this._cookieConfig.secure;
		}

		// unset cookie if value is null
		if (value === COOKIE_NULL_VALUE) {
			setup.maxAge = 0;
		}

		// if it is session cookie and should be removed after browser is closed
		if (isSession) {
			return setup;
		}

		if (typeof(setup.maxAge) !== 'number') {
			setup.maxAge = expiresIn;
		}

		return setup;
	};

/**
 * Validates middleware configuration.
 * @param {Object} config Configuration object.
 */
function validateConfig(config) {
	if (!config || typeof(config) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}
	if (!config.cookie || typeof(config.cookie) !== 'object' ||
		typeof(config.cookie.accessTokenName) !== 'string' ||
		config.cookie.accessTokenName.length === 0 ||
		typeof(config.cookie.refreshTokenName) !== 'string' ||
		config.cookie.refreshTokenName.length === 0) {
		throw new Error(ERROR_COOKIE_CONFIG);
	}
}

/**
 * Writes specified object as JSON to response with specified code.
 * @param {Number} code HTTP status code.
 * @param {Object} object Object to send as JSON.
 * @param {http.ServerResponse} response HTTP response.
 */
function writeToResponse(code, object, response) {
	response.writeHead(code, {
		'Content-Type': 'application/json;charset=UTF-8',
		'Cache-Control': 'no-store',
		Pragma: 'no-cache'
	});
	var json = JSON.stringify(object);
	response.end(json);
}

/**
 * Validates issued authorization from authorization server.
 * @param {Object} issuedAuth Issues authorization object.
 */
function validateIssuedAuth(issuedAuth) {
	// http://tools.ietf.org/html/rfc6749#section-5.1
	if (typeof(issuedAuth[FIELD_ACCESS_TOKEN]) !== 'string') {
		throw new Error(ERROR_RESPONSE_ACCESS_TOKEN);
	}
	if (typeof(issuedAuth[FIELD_TOKEN_TYPE]) !== 'string') {
		throw new Error(ERROR_RESPONSE_TOKEN_TYPE);
	}
	if (issuedAuth[FIELD_TOKEN_TYPE] !== 'Bearer') {
		throw new Error(ERROR_RESPONSE_TOKEN_TYPE_NOT_SUPPORTED);
	}
}