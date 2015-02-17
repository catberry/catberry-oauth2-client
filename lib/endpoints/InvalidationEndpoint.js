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

module.exports = InvalidationEndpoint;

var httpHelper = require('../helpers/httpHelper'),
	URI = require('catberry-uri').URI;

var FIELD_TOKEN = 'token',
	FIELD_RETURN_URI = 'return_uri',
	ERROR_TOKEN_INVALIDATION = 'Wrong token specified for invalidation',
	ERROR_COOKIE_CONFIG = 'At least "cookie.accessTokenName" and ' +
		'"cookie.refreshTokenName" must be set',
	ERROR_CONFIG = 'Config must be an object';

/**
 * Creates new instance of token invalidation endpoint.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @param {Object} authConfig Authorization configuration.
 * @param {Object} endpointConfig Endpoint configuration.
 * @param {Object} endpointConfig.cookie Token cookie configuration.
 * @param {String} endpointConfig.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} endpointConfig.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} endpointConfig.cookie.domain Domain attribute for cookie.
 * @constructor
 */
/*jshint maxcomplexity:false */
function InvalidationEndpoint($serviceLocator, authConfig, endpointConfig) {
	if (!endpointConfig || typeof(endpointConfig) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}
	if (!endpointConfig.cookie || typeof(endpointConfig.cookie) !== 'object' ||
		typeof(endpointConfig.cookie.accessTokenName) !== 'string' ||
		endpointConfig.cookie.accessTokenName.length === 0 ||
		typeof(endpointConfig.cookie.refreshTokenName) !== 'string' ||
		endpointConfig.cookie.refreshTokenName.length === 0) {
		throw new Error(ERROR_COOKIE_CONFIG);
	}
	this._accessTokenName = endpointConfig.cookie.accessTokenName;
	this._refreshTokenName = endpointConfig.cookie.refreshTokenName;
	this._cookiePath = typeof(endpointConfig.cookie.path) === 'string' ?
		endpointConfig.cookie.path : this._cookiePath;
	this._cookieDomain = typeof(endpointConfig.cookie.domain) === 'string' ?
		endpointConfig.cookie.domain : this._cookieDomain;
}

/**
 * Current name of cookie with access token.
 * @type {string}
 * @private
 */
InvalidationEndpoint.prototype._accessTokenName = '';

/**
 * Current name of cookie with refresh token.
 * @type {string}
 * @private
 */
InvalidationEndpoint.prototype._refreshTokenName = '';

/**
 * Current path of cookie.
 * @type {string}
 * @private
 */
InvalidationEndpoint.prototype._cookiePath = '/';

/**
 * Current domain of cookie.
 * @type {string}
 * @private
 */
InvalidationEndpoint.prototype._cookieDomain = '';

/**
 * Handles endpoint invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
InvalidationEndpoint.prototype.handler = function (request, response) {
	var methodError = httpHelper.checkMethod(request, 'get');
	if (methodError) {
		httpHelper.writeError(methodError, response);
		return;
	}

	// anti CSRF protection token in query string must equals token from cookie
	var acessToken = httpHelper.getCookie(this._accessTokenName, request),
		refreshToken = httpHelper.getCookie(this._refreshTokenName, request),
		tokenError = checkToken(acessToken, request);
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

	var uri = new URI(request.url),
		returnUri = uri.query && uri.query.values[FIELD_RETURN_URI] ?
			new URI(uri.query.values[FIELD_RETURN_URI]) :
			null;
	if (returnUri) {
		httpHelper.redirectResponse(response, returnUri);
	} else {
		response.end();
	}
};

/**
 * Checks if token equals to query string token parameter.
 * @param {String} token Access token.
 * @param {http.IncomingMessage} request HTTP request.
 * @returns {Error|null} Error if token is wrong.
 */
function checkToken(token, request) {
	var uri = new URI(request.url);

	if (token && (!uri.query || uri.query.values[FIELD_TOKEN] !== token)) {
		var error = new Error(ERROR_TOKEN_INVALIDATION);
		error.code = 403;
		return error;
	}
	return null;
}