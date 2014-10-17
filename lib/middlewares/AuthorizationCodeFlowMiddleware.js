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

module.exports = AuthorizationCodeFlowMiddleware;

var util = require('util'),
	qs = require('querystring'),
	AuthorizationCodeSender = require('../grants/AuthorizationCodeSender'),
	GrantFlowMiddlewareBase = require('./GrantFlowMiddlewareBase');

var FIELD_CODE = 'code',
	ERROR_REDIRECT_URI = '"redirectUri" not found in config';

util.inherits(AuthorizationCodeFlowMiddleware, GrantFlowMiddlewareBase);

/**
 * Creates new instance of client credentials flow middleware.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @param {Object} config Middleware configuration.
 * @param {String?} config.scope Access scope for middleware.
 * @param {String} config.redirectUri Redirect URI used for obtaining code.
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
 * @extends GrantFlowMiddlewareBase
 */
function AuthorizationCodeFlowMiddleware($serviceLocator, config) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, config);
	this._authorizationCodeSender = new AuthorizationCodeSender(
		$serviceLocator, config
	);
	if (typeof(config.redirectUri) !== 'string' ||
		config.redirectUri.length === 0) {
		throw new Error(ERROR_REDIRECT_URI);
	}
	this._redirectUri = config.redirectUri;
}

/**
 * Current redirect URI.
 * @type {string}
 * @private
 */
AuthorizationCodeFlowMiddleware.prototype._redirectUri = '';

/**
 * Determines if this middleware must end with HTTP response or
 * invoke next function.
 * @type {boolean}
 * @protected
 */
AuthorizationCodeFlowMiddleware.prototype._isResponseNeeded = true;

/**
 * Current authorization code sender.
 * @type {AuthorizationCodeSender}
 * @private
 */
AuthorizationCodeFlowMiddleware.prototype._authorizationCodeSender = null;

/**
 * Obtains authorization from authorization server.
 * @param {http.IncomingMessage} request Incoming HTTP request.
 * @returns {Promise<Object>} Promise for issued authorization.
 */
AuthorizationCodeFlowMiddleware.prototype._obtainAuthorization =
	function (request) {
		var self = this;
		return new Promise(function (fulfill, reject) {
			var methodError = self._checkMethod(request);
			if (methodError) {
				reject(methodError);
				return;
			}
			var headersError = self._checkHeaders(request);
			if (headersError) {
				reject(headersError);
				return;
			}
			var upstream = '';
			request.setEncoding('utf8');
			request
				.on('data', function (chunk) {
					var lengthError = self._checkLength(upstream, chunk);
					if (lengthError) {
						reject(lengthError);
						return;
					}
					upstream += chunk;
				})
				.on('error', function (error) {
					reject(error);
				})
				.on('end', function () {
					var parsed = qs.parse(upstream);
					self._authorizationCodeSender
						.send(parsed[FIELD_CODE], self._redirectUri)
						.then(fulfill, reject);
				});
		});
	};