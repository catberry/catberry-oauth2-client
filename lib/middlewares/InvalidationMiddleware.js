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

module.exports = InvalidationMiddleware;

var cookieHelper = require('../helpers/cookieHelper'),
	url = require('url');

var NULL_VALUE = 'null',
	BEGINS_WITH_SLASH_REGEXP = /^\//,
	FIELD_TOKEN = 'token',
	FIELD_REDIRECT_URI = 'return_uri',
	ERROR_COOKIE_CONFIG = 'At least cookie.accessTokenName must be set',
	ERROR_CONFIG = 'Config must be an object';
/**
 * Creates new instance of token invalidation middleware.
 * @param {Object} config Middleware configuration.
 * @param {Object} config.cookie Token cookie configuration.
 * @param {String} config.cookie.accessTokenName Name of cookie
 * with access token.
 * @param {String?} config.cookie.path Path attribute for cookie
 * ('/' by default).
 * @param {String?} config.cookie.domain Domain attribute for cookie.
 * @constructor
 */
function InvalidationMiddleware(config) {
	if (!config || typeof(config) !== 'object') {
		throw new Error(ERROR_CONFIG);
	}
	if (!config.cookie || typeof(config.cookie) !== 'object' ||
		typeof(config.cookie.accessTokenName) !== 'string' ||
		config.cookie.accessTokenName.length === 0) {
		throw new Error(ERROR_COOKIE_CONFIG);
	}
	this._accessTokenName = config.cookie.accessTokenName;
	this._cookiePath = typeof(config.cookie.path) === 'string' ?
		config.cookie.path : this._cookiePath;
	this._cookieDomain = typeof(config.cookie.domain) === 'string' ?
		config.cookie.domain : this._cookieDomain;
}

/**
 * Current name of cookie with access token.
 * @type {string}
 * @private
 */
InvalidationMiddleware.prototype._accessTokenName = '';

/**
 * Current path of cookie.
 * @type {string}
 * @private
 */
InvalidationMiddleware.prototype._cookiePath = '/';

/**
 * Current domain of cookie.
 * @type {string}
 * @private
 */
InvalidationMiddleware.prototype._cookieDomain = '';

/**
 * Handles middleware invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
InvalidationMiddleware.prototype.handler = function (request, response) {
	var token = cookieHelper.getFromRequest(request)[this._accessTokenName],
		urlInfo = url.parse(request.url, true);

	// anti CSRF protection token in querystring must equals token from cookie
	if (urlInfo.query[FIELD_TOKEN] !== token) {
		response.writeHead(403);
		response.end();
		return;
	}

	cookieHelper.setToResponse(response, {
		key: this._accessTokenName,
		value: NULL_VALUE,
		path: this._cookiePath,
		domain: this._cookieDomain,
		expires: new Date(0),
		maxAge: 0
	});

	var redirectUrl = urlInfo.query[FIELD_REDIRECT_URI];
	if (redirectUrl) {
		var redirectInfo = url.parse(redirectUrl);
		// check if redirect is URL path, not an absolute URL
		if (redirectInfo.protocol === null &&
			redirectInfo.slashes === null &&
			redirectInfo.auth === null &&
			redirectInfo.host === null &&
			redirectInfo.hostname === null &&
			redirectInfo.port === null) {

			if (!BEGINS_WITH_SLASH_REGEXP.test(redirectUrl)) {
				redirectUrl = '/' + redirectUrl;
			}
			response.setHeader('Location', redirectUrl);
			response.writeHead(302);
		}
	}

	response.end();
};