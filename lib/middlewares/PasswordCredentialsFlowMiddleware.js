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

module.exports = PasswordCredentialsFlowMiddleware;

var util = require('util'),
	httpHelper = require('../helpers/httpHelper'),
	qs = require('querystring'),
	PasswordCredentialsSender = require('../grants/PasswordCredentialsSender'),
	GrantFlowMiddlewareBase = require('./GrantFlowMiddlewareBase');

var CONTENT_TYPE = 'application/x-www-form-urlencoded',
	TRACE_OBTAIN_TOKEN = 'Obtaining access token for password credentials...',
	MAX_UPSTREAM_LENGTH = 5120, // 5KB
	FIELD_USERNAME = 'username',
	FIELD_PASSWORD = 'password',
	FIELD_SCOPE = 'scope';

util.inherits(PasswordCredentialsFlowMiddleware, GrantFlowMiddlewareBase);

/**
 * Creates new instance of client credentials flow middleware.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
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
 * @extends GrantFlowMiddlewareBase
 */
function PasswordCredentialsFlowMiddleware($serviceLocator, config) {
	GrantFlowMiddlewareBase.call(this, $serviceLocator, config);
	this._passwordCredentialsSender = new PasswordCredentialsSender(
		$serviceLocator, config
	);
}

/**
 * Current password credentials sender.
 * @type {PasswordCredentialsSender}
 * @private
 */
PasswordCredentialsFlowMiddleware.prototype._passwordCredentialsSender = null;

/**
 * Handles middleware invocation.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 */
PasswordCredentialsFlowMiddleware.prototype.handler =
	function (request, response) {
		this._logger.trace(TRACE_OBTAIN_TOKEN);
		var self = this;
		this._obtainAuthorization(request)
			.then(function (issuedAuth) {
				return self._handleIssuedAuthorization(
					request, response, issuedAuth
				);
			})
			.then(function (responseObject) {
				httpHelper.writeToResponse(200, responseObject, response);
			})
			.then(null, function (reason) {
				self._logger.error(reason);
				httpHelper.writeError(reason, response);
			});
	};

/**
 * Obtains authorization from authorization server.
 * @param {http.IncomingMessage} request Incoming HTTP request.
 * @returns {Promise<Object>} Promise for issued authorization.
 * @private
 */
PasswordCredentialsFlowMiddleware.prototype._obtainAuthorization =
	function (request) {
		var self = this;
		return new Promise(function (fulfill, reject) {
			var methodError = httpHelper.checkMethod(request, 'post');
			if (methodError) {
				reject(methodError);
				return;
			}
			var contentTypeError = httpHelper.checkContentType(
				request, CONTENT_TYPE
			);
			if (contentTypeError) {
				reject(contentTypeError);
				return;
			}
			var upstream = '';
			request.setEncoding('utf8');
			request
				.on('data', function (chunk) {
					var lengthError = httpHelper.checkLength(
						upstream, chunk, MAX_UPSTREAM_LENGTH
					);
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
					parsed[FIELD_SCOPE] = parsed[FIELD_SCOPE] || self._scope;
					self._passwordCredentialsSender.send(
						parsed[FIELD_USERNAME],
						parsed[FIELD_PASSWORD],
						parsed[FIELD_SCOPE]
					)
						.then(fulfill, reject);
				});
		});
	};